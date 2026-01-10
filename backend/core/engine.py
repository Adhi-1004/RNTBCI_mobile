import trimesh
import numpy as np
from trimesh.creation import box
import itertools
import time
from io import BytesIO

# Fallback Class for environments without FCL
class SimpleCollisionManager:
    def __init__(self):
        self.objects = {}
    def add_object(self, name, mesh):
        self.objects[name] = mesh
    def in_collision_single(self, mesh):
        # Simple AABB collision check
        for other_mesh in self.objects.values():
            if np.all(mesh.bounds[0] < other_mesh.bounds[1]) and \
               np.all(mesh.bounds[1] > other_mesh.bounds[0]):
                return True
        return False

# Try to import AND INSTANTIATE CollisionManager
# Trimesh only raises ValueError on init if FCL is missing
try:
    from trimesh.collision import CollisionManager
    # Test instantiation to catch missing FCL early
    _test_mgr = CollisionManager()
except (ValueError, ImportError):
    print("FCL not available, using SimpleCollisionManager fallback")
    CollisionManager = SimpleCollisionManager

# --------------------------------------------------------------------------
# CLOUD DEPLOYMENT CONFIGURATION
# --------------------------------------------------------------------------
IS_CLOUD = True  # Set to True for Render deployment
MAX_BAGS_CLOUD = 4
MAX_CANDIDATES_CLOUD = 400
GRID_STEP_CLOUD = 0.05

# --------------------------------------------------------------------------
# CORE LOGIC (PACKING, BAGS, TRUNK)
# --------------------------------------------------------------------------

def export_scene_to_stl(trunk, placed_bags_info):
    meshes = [trunk.copy()]
    for info in placed_bags_info:
        meshes.append(info['bag_mesh'].copy())
    combined = trimesh.util.concatenate(meshes)
    return combined

_trunk_voxel_cache = {}
def _get_trunk_voxels(trunk_mesh, pitch):
    key = (id(trunk_mesh), float(pitch))
    vox = _trunk_voxel_cache.get(key)
    if vox is None:
        vox = trunk_mesh.voxelized(pitch=pitch)
        _trunk_voxel_cache[key] = vox
    return vox

def strict_containment_or_voxel(trunk_mesh, bag_mesh, voxel_pitch=0.01):
    tol = 0.005
    bag_min, bag_max = bag_mesh.bounds
    trunk_min, trunk_max = trunk_mesh.bounds
    if not (np.all(bag_min >= trunk_min + tol) and np.all(bag_max <= trunk_max - tol)):
        return False
    try:
        if np.all(trunk_mesh.contains(bag_mesh.vertices)):
            return True
    except Exception:
        pass
    try:
        vox = _get_trunk_voxels(trunk_mesh, voxel_pitch)
        filled = vox.is_filled(bag_mesh.vertices)
        return bool(np.all(filled))
    except Exception:
        return True

def enhanced_containment_check(trunk_mesh, bag_mesh):
    return strict_containment_or_voxel(trunk_mesh, bag_mesh)

def clamp_bag_within_trunk(bag_mesh, trunk_bounds):
    TOLERANCE = 0.005
    bag = bag_mesh.copy()
    bag_min, bag_max = bag.bounds
    trunk_min, trunk_max = trunk_bounds
    translation = np.zeros(3)
    translation += np.maximum(0, trunk_min + TOLERANCE - bag_min)
    translation -= np.maximum(0, bag_max - (trunk_max - TOLERANCE))
    if np.any(translation != 0):
        bag.apply_translation(translation)
    return bag

def get_usable_trunk_bounds(trunk_mesh):
    trunk_bounds = trunk_mesh.bounds.copy()
    margin = 0.01
    trunk_bounds[0] += margin
    trunk_bounds[1] -= margin
    return trunk_bounds

bags_data = {
    "Soft Rolling Bag": {
        "SMALL": {"LENGTH": (53.5, 59.5), "BREADTH": (31.6, 40.6), "THICKNESS": (20, 26)},
        "MEDIUM": {"LENGTH": (65.5, 71.5), "BREADTH": (40.6, 46.6), "THICKNESS": (26, 32)},
        "LARGE": {"LENGTH": (77.5, 83.5), "BREADTH": (46.6, 55.6), "THICKNESS": (32, 38)}
    },
    "Hard Rolling Bag": {
        "SMALL": {"LENGTH": (50, 59), "BREADTH": (34.5, 43.5), "THICKNESS": (20, 26)},
        "MEDIUM": {"LENGTH": (65, 74), "BREADTH": (43.5, 52.5), "THICKNESS": (26, 32)},
        "LARGE": {"LENGTH": (77, 83), "BREADTH": (52.5, 58.5), "THICKNESS": (32, 35)}
    },
    "Backpack Bag": {
        "SMALL": {"LENGTH": (42, 42), "BREADTH": (29, 29), "THICKNESS": (15, 15)},
        "MEDIUM": {"LENGTH": (44, 44), "BREADTH": (31, 31), "THICKNESS": (20, 20)},
        "LARGE": {"LENGTH": (52, 52), "BREADTH": (31, 31), "THICKNESS": (25, 25)}
    },
    "Duffle bag": {
        "SMALL": {"LENGTH": (26.45, 26.45), "BREADTH": (45.5, 45.5), "THICKNESS": (24.75, 24.75)},
        "MEDIUM": {"LENGTH": (30, 30), "BREADTH": (56, 56), "THICKNESS": (28, 28)},
        "LARGE": {"LENGTH": (66, 66), "BREADTH": (35, 35), "THICKNESS": (35, 35)}
    },
    "Indian Shopping bag": {
        "SMALL": {"LENGTH": (15, 15), "BREADTH": (15, 15), "THICKNESS": (15, 15)},
        "MEDIUM": {"LENGTH": (34, 34), "BREADTH": (18, 18), "THICKNESS": (9, 9)},
        "LARGE": {"LENGTH": (38, 38), "BREADTH": (18, 18), "THICKNESS": (9, 9)}
    }
}

_bag_cache = {}
def create_bag(bag_type, size):
    cache_key = f"{bag_type}_{size}"
    if cache_key not in _bag_cache:
        dims = bags_data[bag_type][size]
        length = dims["LENGTH"][0] / 100
        breadth = dims["BREADTH"][0] / 100
        thickness = dims["THICKNESS"][0] / 100
        _bag_cache[cache_key] = box(extents=[length, breadth, thickness])
    return _bag_cache[cache_key].copy()

def create_custom_bag(length_cm, breadth_cm, thickness_cm):
    length = length_cm / 100
    breadth = breadth_cm / 100
    thickness = thickness_cm / 100
    return box(extents=[length, breadth, thickness])

def unique_rotations(bag_mesh, tol=1e-6):
    extents = bag_mesh.extents
    if abs(extents[0] - extents[1]) < tol and abs(extents[1] - extents[2]) < tol:
        return [bag_mesh.copy()]
    unique_extents = set()
    for perm in itertools.permutations(extents):
        unique_extents.add(tuple(np.round(perm, 6)))
    return [box(extents=ext) for ext in unique_extents]

def load_trunk(file_content):
    trunk = trimesh.load_mesh(BytesIO(file_content), file_type='stl')
    if trunk.extents.max() > 10:
        trunk.apply_scale(0.001)
    trunk.apply_translation(-trunk.centroid)
    trunk.apply_translation([0, 0, -trunk.bounds[0][2]])
    R = trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0])
    trunk.apply_transform(R)
    if not trunk.is_watertight:
        trunk.fill_holes()
    return trunk

def fittest_placement(trunk, bags_info, progress_callback=None):
    placed_info, unplaced_info = [], []
    collision_manager = CollisionManager()
    trunk_bounds = get_usable_trunk_bounds(trunk)
    
    # CLOUD SAFEGUARD: Coarser resolution
    step = GRID_STEP_CLOUD if IS_CLOUD else 0.05
    
    minx, miny, minz = trunk_bounds[0]
    maxx, maxy, maxz = trunk_bounds[1]

    all_bags_data = []
    for i, bag_info in enumerate(bags_info):
        if len(bag_info) == 2:
            btype, sz = bag_info
            mesh = create_bag(btype, sz)
            all_bags_data.append({'original_idx': i, 'btype': btype, 'size': sz, 'mesh': mesh})
        elif len(bag_info) == 4:
            btype, length, breadth, thickness = bag_info
            mesh = create_custom_bag(length, breadth, thickness)
            all_bags_data.append({
                'original_idx': i, 'btype': 'Custom',
                'size': f'{length:.0f}×{breadth:.0f}×{thickness:.0f}cm',
                'mesh': mesh, 'dimensions': (length, breadth, thickness)
            })
    sorted_bags = sorted(all_bags_data, key=lambda item: item['mesh'].volume, reverse=True)

    # CLOUD SAFEGUARD: Iteration limit per bag
    max_checks = MAX_CANDIDATES_CLOUD if IS_CLOUD else float('inf')

    total_bags = len(sorted_bags)
    for i, bag_data in enumerate(sorted_bags):
        if progress_callback:
            progress_callback(i / total_bags, f"Placing bag {i+1}/{total_bags} ({bag_data['btype']})...")
            
        bag_base = bag_data['mesh']
        best_placement_for_bag = None
        best_score = (float('inf'), float('inf'), float('inf'))
        
        checks = 0
        stop_bag_search = False

        for bag_rotation in unique_rotations(bag_base):
            if stop_bag_search: break
            extents = bag_rotation.extents
            if np.any(extents > (trunk_bounds[1] - trunk_bounds[0])):
                continue
            TOLERANCE = 0.005
            x_range = np.arange(minx + TOLERANCE, min(maxx - extents[0] - TOLERANCE, maxx - 0.01), step)
            y_range = np.arange(miny + TOLERANCE, min(maxy - extents[1] - TOLERANCE, maxy - 0.01), step)
            z_range = np.arange(minz + TOLERANCE, min(maxz - extents[2] - TOLERANCE, maxz - 0.01), step)
            for z in z_range:
                if z > best_score[0]: break
                if stop_bag_search: break
                for y in y_range:
                    if stop_bag_search: break
                    for x in x_range:
                        checks += 1
                        if checks > max_checks:
                            stop_bag_search = True
                            break

                        trial = bag_rotation.copy()
                        trial.apply_translation([x - trial.bounds[0][0], y - trial.bounds[0][1], z - trial.bounds[0][2]])
                        if enhanced_containment_check(trunk, trial) and not collision_manager.in_collision_single(trial):
                            current_score = (trial.bounds[0][2], trial.bounds[0][1], trial.bounds[0][0])
                            if current_score < best_score:
                                best_score = current_score
                                best_placement_for_bag = trial
        
        if best_placement_for_bag is not None:
            clamped_bag = clamp_bag_within_trunk(best_placement_for_bag, trunk_bounds)
            placed_info.append({
                'bag_mesh': clamped_bag, 'btype': bag_data['btype'],
                'size': bag_data['size'], 'original_idx': bag_data['original_idx']
            })
            collision_manager.add_object(f"bag_{bag_data['original_idx']}", clamped_bag)
        else:
            dims = bag_base.extents * 100
            unplaced_info.append({
                "Bag": f"{bag_data['btype']} ({bag_data['size']})",
                "Dimensions (cm)": f"{dims[0]:.1f}x{dims[1]:.1f}x{dims[2]:.1f}",
                "Reason": "No suitable position found"
            })
    return {"placed_bags_info": placed_info, "unplaced_bags_info": unplaced_info, "processing_time": 0.0}

def fast_apply_gravity(trunk, placed_bags_info, step_size=0.02):
    if not placed_bags_info: return placed_bags_info
    settled_bags_info = []
    collision_manager = CollisionManager()
    sorted_bags_info = sorted(placed_bags_info, key=lambda b: b['bag_mesh'].bounds[0][2])
    for info in sorted_bags_info:
        bag = info['bag_mesh'].copy()
        while True:
            bag.apply_translation([0, 0, -step_size])
            if not enhanced_containment_check(trunk, bag) or collision_manager.in_collision_single(bag):
                bag.apply_translation([0, 0, step_size])
                break
        clamped_bag = clamp_bag_within_trunk(bag, trunk.bounds)
        info['bag_mesh'] = clamped_bag
        settled_bags_info.append(info)
        collision_manager.add_object(f"bag_{info['original_idx']}", clamped_bag)
    return settled_bags_info

def compact_bags(trunk, placed_bags_info, step_size=0.005, passes=5):
    if not placed_bags_info: return placed_bags_info
    for _ in range(passes):
        moved_any = False
        sorted_infos = sorted(placed_bags_info, key=lambda b: float(np.linalg.norm(b['bag_mesh'].bounds[0])))
        for info in sorted_infos:
            others = CollisionManager()
            for other in placed_bags_info:
                if other['original_idx'] != info['original_idx']:
                    others.add_object(f"bag_{other['original_idx']}", other['bag_mesh'])
            bag = info['bag_mesh'].copy()
            directions = [[0, -1, 0], [-1, 0, 0], [-1, -1, 0], [0, 0, -1], [-1, 0, -1], [0, -1, -1], [-1, -1, -1]]
            for direction in directions:
                dir_vec = np.array(direction, dtype=float)
                while True:
                    bag.apply_translation(dir_vec * step_size)
                    if not enhanced_containment_check(trunk, bag) or others.in_collision_single(bag):
                        bag.apply_translation(-dir_vec * step_size)
                        break
                    moved_any = True
            info['bag_mesh'] = clamp_bag_within_trunk(bag, trunk.bounds)
        if not moved_any: break
    return placed_bags_info

def micro_adjust_bags(trunk, placed_bags_info, step_size=0.001, passes=3):
    if not placed_bags_info: return placed_bags_info
    for _ in range(passes):
        moved_any = False
        sorted_infos = sorted(placed_bags_info, key=lambda b: float(np.linalg.norm(b['bag_mesh'].bounds[0])))
        for info in sorted_infos:
            others = CollisionManager()
            for other in placed_bags_info:
                if other['original_idx'] != info['original_idx']:
                    others.add_object(f"bag_{other['original_idx']}", other['bag_mesh'])
            bag = info['bag_mesh'].copy()
            directions = [[0, -1, 0], [-1, 0, 0], [0, 0, -1], [-1, -1, 0], [-1, 0, -1], [0, -1, -1], [-1, -1, -1]]
            for direction in directions:
                dir_vec = np.array(direction, dtype=float)
                bag.apply_translation(dir_vec * step_size)
                if enhanced_containment_check(trunk, bag) and not others.in_collision_single(bag):
                    moved_any = True
                else:
                    bag.apply_translation(-dir_vec * step_size)
            info['bag_mesh'] = clamp_bag_within_trunk(bag, trunk.bounds)
        if not moved_any: break
    return placed_bags_info

def fill_remaining_gaps(trunk, placed_bags_info, bags_info, step_size=0.02):
    if not placed_bags_info or not bags_info: return placed_bags_info
    placed_indices = {info['original_idx'] for info in placed_bags_info}
    unplaced_bags = []
    for i, bag_info in enumerate(bags_info):
        if i in placed_indices: continue
        if len(bag_info) == 2:
            btype, sz = bag_info
            mesh = create_bag(btype, sz)
            unplaced_bags.append({'original_idx': i, 'btype': btype, 'size': sz, 'mesh': mesh})
        else:
            btype, length, breadth, thickness = bag_info
            mesh = create_custom_bag(length, breadth, thickness)
            unplaced_bags.append({'original_idx': i, 'btype': 'Custom', 'size': f'{length:.0f}×{breadth:.0f}×{thickness:.0f}cm', 'mesh': mesh})
    if not unplaced_bags: return placed_bags_info
    unplaced_bags.sort(key=lambda b: b['mesh'].volume, reverse=True)
    collision_manager = CollisionManager()
    for info in placed_bags_info:
        collision_manager.add_object(f"bag_{info['original_idx']}", info['bag_mesh'])
    trunk_bounds = get_usable_trunk_bounds(trunk)
    minx, miny, minz = trunk_bounds[0]
    maxx, maxy, maxz = trunk_bounds[1]
    TOL = 0.005
    # CLOUD SAFEGUARD settings
    actual_step = GRID_STEP_CLOUD if IS_CLOUD else step_size
    max_cands = MAX_CANDIDATES_CLOUD if IS_CLOUD else 400
    
    coarse, fine, MAX_CANDIDATES = max(0.10, actual_step * 5.0), max(0.03, actual_step), max_cands
    for bag_data in unplaced_bags:
        bag_base = bag_data['mesh']
        best_placement_for_bag, best_score, candidates_checked = None, (float('inf'), float('inf')), 0
        for bag_rotation in unique_rotations(bag_base):
            extents = bag_rotation.extents
            if np.any(extents > (trunk_bounds[1] - trunk_bounds[0])): continue
            x_range = np.arange(minx + TOL, min(maxx - extents[0] - TOL, maxx - 0.01), coarse)
            y_range = np.arange(miny + TOL, min(maxy - extents[1] - TOL, maxy - 0.01), coarse)
            z = minz + TOL
            top_hits = []
            for y in y_range:
                for x in x_range:
                    trial = bag_rotation.copy()
                    trial.apply_translation([x - trial.bounds[0][0], y - trial.bounds[0][1], z - trial.bounds[0][2]])
                    if strict_containment_or_voxel(trunk, trial) and not collision_manager.in_collision_single(trial):
                        score = (trial.bounds[0][1], trial.bounds[0][0])
                        top_hits.append((score, trial))
                        if len(top_hits) > 12:
                            top_hits.sort(key=lambda t: t[0])
                            top_hits = top_hits[:12]
            for _, coarse_trial in top_hits:
                cx0, cy0, _ = coarse_trial.bounds[0]
                x_center, y_center = cx0, cy0
                x_fine = np.arange(max(minx + TOL, x_center - coarse), min(maxx - extents[0] - TOL, x_center + coarse), fine)
                y_fine = np.arange(max(miny + TOL, y_center - coarse), min(maxy - extents[1] - TOL, y_center + coarse), fine)
                for y in y_fine:
                    for x in x_fine:
                        trial = bag_rotation.copy()
                        trial.apply_translation([x - trial.bounds[0][0], y - trial.bounds[0][1], z - trial.bounds[0][2]])
                        candidates_checked += 1
                        if strict_containment_or_voxel(trunk, trial) and not collision_manager.in_collision_single(trial):
                            score = (trial.bounds[0][1], trial.bounds[0][0])
                            if score < best_score:
                                best_score = score
                                best_placement_for_bag = trial
                        if candidates_checked >= MAX_CANDIDATES: break
                    if candidates_checked >= MAX_CANDIDATES: break
                if candidates_checked >= MAX_CANDIDATES: break
            if candidates_checked >= MAX_CANDIDATES: break
        if best_placement_for_bag is not None:
            clamped_bag = clamp_bag_within_trunk(best_placement_for_bag, trunk_bounds)
            placed_bags_info.append({
                'bag_mesh': clamped_bag, 'btype': bag_data['btype'],
                'size': bag_data['size'], 'original_idx': bag_data['original_idx']
            })
            collision_manager.add_object(f"bag_{bag_data['original_idx']}", clamped_bag)
    return placed_bags_info

def optimized_packing(trunk, bags_info, progress_callback=None):
    start_time = time.time()
    if progress_callback: progress_callback(0.0, "🔎 Finding initial placements (0/0)...")
    results = fittest_placement(trunk, bags_info, progress_callback)
    placed_bags_info = results["placed_bags_info"]
    if not placed_bags_info:
        results_dict = {"placed_bags_info": [], "unplaced_bags_info": results["unplaced_bags_info"], "processing_time": float(time.time() - start_time)}
        return results_dict
    
    if progress_callback: progress_callback(0.33, "🔄 Applying gravity...")
    settled_bags_info = fast_apply_gravity(trunk, placed_bags_info)
    
    if progress_callback: progress_callback(0.55, "📦 Compacting bags...")
    compacted_bags_info = compact_bags(trunk, settled_bags_info)
    
    if progress_callback: progress_callback(0.75, "🔍 Filling gaps...")
    gap_filled_bags_info = fill_remaining_gaps(trunk, compacted_bags_info, bags_info)
    
    if progress_callback: progress_callback(0.90, "🔧 Micro-adjustments...")
    micro_adjusted_bags_info = micro_adjust_bags(trunk, gap_filled_bags_info)
    
    if progress_callback: progress_callback(0.98, "🔄 Final gravity settling...")
    final_bags_info = fast_apply_gravity(trunk, micro_adjusted_bags_info)
    
    results_dict = {"placed_bags_info": final_bags_info, "unplaced_bags_info": results["unplaced_bags_info"], "processing_time": float(time.time() - start_time)}
    
    if progress_callback: progress_callback(1.0, "✅ Packing completed!")
    return results_dict

def calculate_space_utilization(trunk, placed_bags_info):
    # Calculate Trunk Volume
    trunk_volume = 0
    if trunk.is_watertight and trunk.volume > 0:
        trunk_volume = trunk.volume
    else:
        # Fallback: Convex Hull is usually a better approximation of the "void" than AABB
        try:
            trunk_volume = trunk.convex_hull.volume
        except Exception:
            trunk_volume = trunk.extents.prod()

    placed_volume = sum(info['bag_mesh'].volume for info in placed_bags_info)
    if not placed_bags_info:
        return {'volume_utilization': 0.0, 'space_utilization_bbox': 0.0, 'packing_efficiency_bbox': 0.0}
    all_bounds = np.array([info['bag_mesh'].bounds for info in placed_bags_info])
    overall_min, overall_max = np.min(all_bounds[:, 0, :], axis=0), np.max(all_bounds[:, 1, :], axis=0)
    used_space_bbox_volume = (overall_max - overall_min).prod()
    
    trunk_bbox_volume = trunk.extents.prod()
    
    volume_utilization = (placed_volume / trunk_volume) * 100 if trunk_volume > 0 else 0
    space_utilization_bbox = (used_space_bbox_volume / trunk_bbox_volume) * 100 if trunk_bbox_volume > 0 else 0
    packing_efficiency_bbox = (placed_volume / used_space_bbox_volume) * 100 if used_space_bbox_volume > 0 else 0
    return {
        'volume_utilization': np.clip(volume_utilization, 0, 100),
        'space_utilization_bbox': np.clip(space_utilization_bbox, 0, 100),
        'packing_efficiency_bbox': np.clip(packing_efficiency_bbox, 0, 100),
    }
