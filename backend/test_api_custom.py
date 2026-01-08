import requests
import trimesh
import base64
import json
from io import BytesIO

def create_dummy_trunk_stl():
    # Create a simple box 100x100x100 cm (1x1x1 m)
    # The packing engine expects meters usually, let's verify.
    # engine.py: load_trunk applies scale 0.001 if max extent > 10.
    # If we create a 1x1x1 unit box, it's 1 meter.
    mesh = trimesh.creation.box(extents=[1.0, 1.0, 1.0])
    
    io_obj = BytesIO()
    mesh.export(io_obj, file_type='stl')
    return io_obj.getvalue()

def test_custom_optimization():
    print("Creating dummy STL...")
    stl_bytes = create_dummy_trunk_stl()
    stl_base64 = base64.b64encode(stl_bytes).decode('utf-8')
    
    payload = {
        "car_model": "Custom",
        "custom_trunk_file": stl_base64,
        "bags": [
            {
                "type": "Soft Rolling Bag",
                "size": "SMALL"
            },
             {
                "type": "Backpack Bag",
                "size": "MEDIUM"
            }
        ]
    }
    
    print("Sending request to http://localhost:8000/optimize...")
    try:
        response = requests.post("http://localhost:8000/optimize", json=payload)
        
        if response.status_code == 200:
            print("✅ Success! Status Code 200")
            data = response.json()
            print(f"Placed Bags: {len(data['placed_bags'])}")
            print(f"Unplaced Bags: {len(data['unplaced_bags'])}")
            print("Stats:", json.dumps(data['stats'], indent=2))
            
            if len(data['placed_bags']) > 0:
                print("✅ Bags were successfully placed in the custom STL!")
            else:
                print("⚠️ No bags placed, but request succeeded.")
        else:
            print(f"❌ Failed. Status Code: {response.status_code}")
            print("Response:", response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to localhost:8000. Is the server running?")

if __name__ == "__main__":
    test_custom_optimization()
