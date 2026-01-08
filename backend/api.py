from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Tuple, Any
import trimesh
from io import BytesIO
import numpy as np
import base64
import os



from core.engine import (
    load_trunk,
    bags_data,
    export_scene_to_stl,
    calculate_space_utilization,
    optimized_packing
)

from core.db import authenticate_user, save_user

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    name: Optional[str] = None

class BagItem(BaseModel):
    type: str # "Soft Rolling Bag", "Custom", etc.
    size: Optional[str] = None # "SMALL", "MEDIUM", etc.
    dimensions: Optional[List[float]] = None # [L, B, T] in cm for Custom

class OptimizationRequest(BaseModel):
    car_model: str # "Renault Kiger" or "Custom"
    bags: List[BagItem]
    custom_trunk_file: Optional[str] = None # Base64 encoded STL if custom

# Auth Endpoints
@app.post("/auth/login")
async def login(req: LoginRequest):
    if authenticate_user(req.username, req.password):
        return {"success": True, "message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/auth/register")
async def register(req: RegisterRequest):
    if save_user(req.username, req.password, req.email or "", req.name or ""):
        return {"success": True, "message": "Registration successful"}
    raise HTTPException(status_code=400, detail="Username already exists or database error")

# Data Endpoints
@app.get("/cars")
def get_cars():
    return [
        {
            "name": "Renault Kiger",
            "description": "Compact SUV with versatile trunk space",
            "volume": "405L",
            "dimensions": "L: 1.2m × W: 0.9m × H: 0.7m",
            "image": "kiger.png" # Placeholder
        },
        {
            "name": "Custom Vehicle",
            "description": "Upload your own vehicle's STL model",
            "volume": "Variable",
            "dimensions": "Custom",
            "image": "custom.png"
        }
    ]

@app.get("/bags")
def get_bags():
    return bags_data

# Optimization Endpoint
@app.post("/optimize")
async def optimize(req: OptimizationRequest):
    # 1. Load Trunk
    trunk = None
    if req.car_model == "Renault Kiger":
        try:
            with open("Surface model (1).stl", "rb") as f:
                trunk = load_trunk(f.read())
        except FileNotFoundError:
             raise HTTPException(status_code=500, detail="Default car model file not found on server")
    elif req.car_model == "Custom" and req.custom_trunk_file:
         # Decode base64
         try:
             file_bytes = base64.b64decode(req.custom_trunk_file.split(",")[1] if "," in req.custom_trunk_file else req.custom_trunk_file)
             trunk = load_trunk(file_bytes)
         except Exception:
             raise HTTPException(status_code=400, detail="Invalid custom trunk file")
    
    if not trunk:
        raise HTTPException(status_code=400, detail="Trunk could not be loaded")

    # 2. Prepare Bags Info
    bags_info = []
    for bag in req.bags:
        if bag.type == "Custom":
            if not bag.dimensions or len(bag.dimensions) != 3:
                continue
            bags_info.append(("Custom", bag.dimensions[0], bag.dimensions[1], bag.dimensions[2]))
        else:
            if not bag.size: continue
            bags_info.append((bag.type, bag.size))
            
    # 3. Run Optimization
    try:
        # We don't have the Streamlit progress bar here, so we pass None
        results = optimized_packing(trunk, bags_info, progress_callback=None)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    # 4. Format Results for Frontend
    # The frontend needs meshes to render. Sending full mesh data (vertices/faces) as JSON is heavy.
    # A better approach for Three.js is to send position/rotation/scale or a simplified geometry.
    # HOWEVER, our packing logic modifies the mesh vertices directly (apply_translation).
    # So we must send the final vertices.
    
    placed_items = []
    for info in results["placed_bags_info"]:
        mesh = info["bag_mesh"]
        # Convert mesh to basic data
        # To keep payload small, we could export to STL string, or send vertices/indices.
        # Sending STL string for each bag is robust.
        
        stl_io = BytesIO()
        mesh.export(stl_io, file_type='stl')
        stl_base64 = base64.b64encode(stl_io.getvalue()).decode('utf-8')
        
        placed_items.append({
            "id": info.get("original_idx"),
            "type": info["btype"],
            "size": info["size"],
            "mesh_stl": stl_base64, # Frontend will load this
            "color": "#ff0000" # Frontend should assign colors
        })
        
    stats = calculate_space_utilization(trunk, results["placed_bags_info"])
    
    # Also send Trunk mesh if it was custom, or just the name if standard
    trunk_stl = None
    if req.car_model == "Custom" or True: # Always send trunk for viz consistency?
        # Maybe just send it once? For now send it.
        t_io = BytesIO()
        trunk.export(t_io, file_type='stl')
        trunk_stl = base64.b64encode(t_io.getvalue()).decode('utf-8')
    
    # Generate Full Packed Scene STL for Export
    packed_stl = None
    if results["placed_bags_info"]:
        scene_mesh = export_scene_to_stl(trunk, results["placed_bags_info"])
        s_io = BytesIO()
        scene_mesh.export(s_io, file_type="stl")
        packed_stl = base64.b64encode(s_io.getvalue()).decode('utf-8')

    return {
        "success": True,
        "placed_bags": placed_items,
        "unplaced_bags": results["unplaced_bags_info"],
        "stats": stats,
        "trunk_mesh": trunk_stl, # Optional, frontend might already have Kiger mesh
        "packed_stl": packed_stl,
        "processing_time": results.get("processing_time", 0.0)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
