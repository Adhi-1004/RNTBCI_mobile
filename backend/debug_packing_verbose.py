
import sys
import os
import trimesh
import numpy as np
import logging

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
logging.basicConfig(level=logging.INFO)

from core.engine import load_trunk, create_bag, get_usable_trunk_bounds, unique_rotations

# Load Trunk
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
stl_path = os.path.join(BASE_DIR, "Surface model (1).stl")
with open(stl_path, "rb") as f:
    content = f.read()

print(f"--- Loading Trunk from {stl_path} ---")
trunk = load_trunk(content)
print(f"Trunk Loaded.")
print(f"  Vertices: {len(trunk.vertices)}")
print(f"  Faces: {len(trunk.faces)}")
print(f"  Bounds: \n{trunk.bounds}")
print(f"  Extents: {trunk.extents}")
print(f"  Watertight: {trunk.is_watertight}")
print(f"  Volume: {trunk.volume}")

# Create Bag
print("\n--- Creating Bag ---")
bag = create_bag("Soft Rolling Bag", "SMALL")
print(f"Bag Extents: {bag.extents}")

# Simulate Placement Loop
print("\n--- Simulating Placement Loop ---")
trunk_bounds = get_usable_trunk_bounds(trunk)
minx, miny, minz = trunk_bounds[0]
maxx, maxy, maxz = trunk_bounds[1]
step = 0.05

rotations = unique_rotations(bag)
print(f"Unique Rotations: {len(rotations)}")

found_valid = False

for i, bag_rotation in enumerate(rotations):
    if found_valid: break
    print(f"\nRotation {i}: Extents {bag_rotation.extents}")
    
    # Check if bag fits in bounds at all
    if np.any(bag_rotation.extents > (trunk_bounds[1] - trunk_bounds[0])):
        print(f"  > Bag too big for trunk bounds! Trunk span: {trunk_bounds[1] - trunk_bounds[0]}")
        continue

    # Try 5x5 grid at bottom Z
    z = minz + 0.01
    x_range = np.arange(minx, maxx, step)[:5] 
    y_range = np.arange(miny, maxy, step)[:5]
    
    for y in y_range:
        for x in x_range:
            trial = bag_rotation.copy()
            # Position at x,y,z
            # Translate so min corner is at x,y,z
            translation = [x - trial.bounds[0][0], y - trial.bounds[0][1], z - trial.bounds[0][2]]
            trial.apply_translation(translation)
            
            # Check AABB
            tol = 0.005
            bag_min, bag_max = trial.bounds
            trunk_min, trunk_max = trunk.bounds
            aabb_ok = (np.all(bag_min >= trunk_min + tol) and np.all(bag_max <= trunk_max - tol))
            
            if not aabb_ok:
                 # Print detailed failure
                 fail_msg = []
                 if not np.all(bag_min >= trunk_min + tol): 
                     fail_msg.append(f"MinBoundFail (BagMin {bag_min} < TrunkMin {trunk_min} + {tol})")
                 if not np.all(bag_max <= trunk_max - tol):
                     fail_msg.append(f"MaxBoundFail (BagMax {bag_max} > TrunkMax {trunk_max} - {tol})")
                 # print(f"  [X={x:.2f}, Y={y:.2f}] AABB Fail: {', '.join(fail_msg)}")
                 pass
            else:
                 print(f"  [X={x:.2f}, Y={y:.2f}] AABB PASS! Checking Mesh Containment...")
                 
                 # Check Mesh Containment
                 contains = False
                 try:
                     # Check center
                     if trunk.contains([trial.centroid])[0]:
                        # Check vertices
                        if np.all(trunk.contains(trial.vertices)):
                            contains = True
                 except Exception as e:
                     print(f"    Exception in contains: {e}")
                
                 if contains:
                     print(f"    >>> PLACEMENT VALID! <<<")
                     found_valid = True
                     break
                 else:
                     print(f"    Mesh Containment FAIL.")

if not found_valid:
    print("\nFAILED to find any valid placement.")
else:
    print("\nSUCCESS: Found valid placement.")

