
import sys
import os
import trimesh
from io import BytesIO
import numpy as np

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.engine import load_trunk

# Load the file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, "Surface model (1).stl"), "rb") as f:
    content = f.read()

print("--- Loading Trunk ---")
trunk = load_trunk(content)
print(f"Trunk Extents: {trunk.extents}")
print(f"Trunk Bounds: {trunk.bounds}")
print(f"Max Extent: {trunk.extents.max()}")
