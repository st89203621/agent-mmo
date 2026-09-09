"""Blender head refinement and deterministic Unity mesh export.

Initial build: blender -b --python refine.py -- --source head-source.json
Artist export: blender -b FemaleHead.blend --python refine.py -- --export-only
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bmesh
import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(__file__).resolve().parent
TEXTURES = ROOT / "Assets/_Game/Art/CharacterSources/Textures"
FACE_TEXTURE = ROOT / "Assets/_Game/Art/CharacterGenerated/Textures/FemaleFace.png"


def smooth(a, b, value):
    t = max(0.0, min(1.0, (value - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def gaussian(value, center, radius):
    return math.exp(-((value - center) / radius) ** 2)


def create_part(part, collection):
    # Unity head-local +Y up/+Z front maps to Blender +Z up/-Y front.
    vertices = [(p["x"], -p["z"], p["y"]) for p in part["vertices"]]
    indices = part["triangles"]
    # This mapping is a rotation; retain the source winding and outward normals.
    faces = [tuple(indices[i:i + 3]) for i in range(0, len(indices), 3)]
    mesh = bpy.data.meshes.new(part["name"])
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    layer = mesh.uv_layers.new(name="UVMap")
    for loop in mesh.loops:
        uv = part["uv"][loop.vertex_index]
        layer.data[loop.index].uv = (uv["x"], uv["y"])
    obj = bpy.data.objects.new(part["name"], mesh)
    collection.objects.link(obj)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.000001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def components(mesh):
    neighbors = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        neighbors[a].add(b)
        neighbors[b].add(a)
    remaining = set(range(len(mesh.vertices)))
    while remaining:
        connected, pending = set(), [next(iter(remaining))]
        while pending:
            index = pending.pop()
            if index in connected:
                continue
            connected.add(index)
            pending.extend(neighbors[index] - connected)
        remaining.difference_update(connected)
        yield [mesh.vertices[i] for i in connected]


def refine_brows(obj):
    for group in components(obj.data):
        source = [(v, v.co.copy()) for v in group]
        center = sum(p.z for _, p in source) / len(source)
        is_brow = center > 0.124
        print("BROW_ISLAND", len(group), "height", round(center, 5), "brow", is_brow)
        for vertex, point in source:
            nearby = [p for _, p in source if abs(p.x - point.x) < 0.003]
            lower, upper = min(p.z for p in nearby), max(p.z for p in nearby)
            if is_brow:
                t = max(0, min(1, (abs(point.x) - 0.013) / 0.046))
                curve = 0.132 + 0.004 * math.sin(t * math.pi) - 0.002 * t
                vertex.co.z = curve + (point.z - (lower + upper) * 0.5) * (0.42 - 0.15 * t)
            else:
                vertex.co.z = lower + (point.z - lower) * 0.55


def refine_face(obj):
    for vertex in obj.data.vertices:
        x, z, y = vertex.co.x, -vertex.co.y, vertex.co.z
        front = smooth(0.015, 0.068, z)
        neck = smooth(-0.035, -0.005, y)
        jaw = gaussian(y, 0.018, 0.042) * front * neck
        nose = gaussian(x, 0, 0.021) * gaussian(y, 0.073, 0.039) * front
        mouth = gaussian(x, 0, 0.030) * gaussian(y, 0.026, 0.016) * front
        vertex.co.x = x * (1 - 0.065 * jaw - 0.13 * nose - 0.075 * mouth)
        vertex.co.y = -(z - 0.016 * nose - 0.005 * mouth)
        vertex.co.z = y + 0.003 * gaussian(y, -0.003, 0.022) * front * neck

    # Recover quads before one subdivision; keep the open collar boundary fixed.
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.join_triangles(bm, faces=list(bm.faces), angle_face_threshold=0.7,
                             angle_shape_threshold=0.7, cmp_uvs=True)
    crease = bm.edges.layers.float.new("crease_edge")
    for edge in bm.edges:
        if edge.is_boundary:
            edge[crease] = 1.0
    bm.to_mesh(obj.data)
    bm.free()
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("Portrait surface", "SUBSURF")
    modifier.levels = 1
    modifier.render_levels = 1
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def paint_texture():
    original = bpy.data.images.load(str(TEXTURES / "T_Superhero_Female_Light_BaseColor.png"))
    width, height = original.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    original.pixels.foreach_get(pixels)
    pixels = pixels.reshape(height, width, 4)
    rgb = pixels[:, :, :3]
    luminance = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    target = np.array([0.72, 0.53, 0.44], dtype=np.float32)
    base = target + (luminance[:, :, None] - 0.49) * 0.30
    result = rgb * 0.35 + base * 0.65
    u, v = np.meshgrid(np.arange(width) / width, np.arange(height) / height)
    lips = np.exp(-((u - 0.183) / 0.032) ** 6 - ((v - 0.737) / 0.014) ** 4)
    lip_detail = np.clip((rgb[:, :, 0] - rgb[:, :, 1] - 0.15) / 0.13, 0, 1)
    mask = (lips * lip_detail * 0.75)[:, :, None]
    rose = np.array([0.59, 0.30, 0.29], dtype=np.float32) + (luminance[:, :, None] - 0.45) * 0.28
    result = result * (1 - mask) + rose * mask
    pixels[:, :, :3] = np.clip(result, 0, 1)
    image = bpy.data.images.new("FemaleFace", width=width, height=height, alpha=True)
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(FACE_TEXTURE)
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def material(name, image, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = roughness
    texture = mat.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    mat.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def export_head(collection):
    result = {"parts": []}
    for obj in collection.objects:
        if obj.type != "MESH":
            continue
        mesh = obj.data
        mesh.calc_loop_triangles()
        uv = mesh.uv_layers.active.data
        part = {"name": obj.name, "vertices": [], "normals": [], "uv": [], "triangles": []}
        lookup = {}
        for triangle in mesh.loop_triangles:
            for index in triangle.loops:
                loop = mesh.loops[index]
                p = mesh.vertices[loop.vertex_index].co
                n = mesh.corner_normals[index].vector
                t = uv[index].uv
                key = (loop.vertex_index, tuple(t), tuple(n))
                if key not in lookup:
                    lookup[key] = len(part["vertices"])
                    part["vertices"].append({"x": p.x, "y": p.z, "z": -p.y})
                    part["normals"].append({"x": n.x, "y": n.z, "z": -n.y})
                    part["uv"].append({"x": t.x, "y": t.y})
                part["triangles"].append(lookup[key])
        assert all(math.isfinite(v) for point in part["vertices"] for v in point.values())
        assert len(set(part["triangles"])) == len(part["vertices"])
        result["parts"].append(part)
        print("UNITY_HEAD_EXPORT", obj.name, "vertices", len(part["vertices"]), "triangles", len(part["triangles"]) // 3)
    (OUTPUT / "head.json").write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path)
    parser.add_argument("--export-only", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if args.export_only:
        export_head(bpy.data.collections["Game Head"])
        image = bpy.data.images.get("FemaleFace")
        if image:
            image.filepath_raw = str(FACE_TEXTURE)
            image.save()
        return
    if not args.source:
        parser.error("Initial refinement requires --source from FaceArtValidation's original head export.")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    game = bpy.data.collections.new("Game Head")
    original = bpy.data.collections.new("Original CC0 Head")
    bpy.context.scene.collection.children.link(game)
    bpy.context.scene.collection.children.link(original)
    original.hide_render = True
    original.hide_viewport = True
    face_image = paint_texture()
    eye_image = bpy.data.images.load(str(TEXTURES / "T_Eye_Brown.png"))
    eye_image.pack()
    hair_image = bpy.data.images.load(str(TEXTURES / "T_Hair_1_BaseColor.png"))
    hair_image.pack()
    for part in json.loads(args.source.read_text(encoding="utf-8"))["parts"]:
        obj = create_part(part, game)
        backup = obj.copy()
        backup.data = obj.data.copy()
        backup.name = part["name"] + " Original"
        original.objects.link(backup)
        if "Superhero" in obj.name:
            refine_face(obj)
            obj.data.materials.append(material("Soft face", face_image, 0.65))
        elif obj.name == "Eyebrows":
            refine_brows(obj)
            obj.data.materials.append(material("Brows and lashes", hair_image, 0.7))
        else:
            obj.data.materials.append(material("Eyes", eye_image, 0.25))
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_distance = 0.55
                area.spaces.active.region_3d.view_location = (0, 0, 0.08)
                area.spaces.active.shading.type = "MATERIAL"
    export_head(game)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "FemaleHead.blend"))
    print("FEMALE_HEAD_REFINEMENT_COMPLETE", bpy.app.version_string)


if __name__ == "__main__":
    main()
