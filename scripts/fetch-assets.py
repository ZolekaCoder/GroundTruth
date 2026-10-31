"""Download the CC0 Poly Haven assets the 3D newsroom uses into web/public/assets/3d/.
Run once: python3 scripts/fetch-assets.py   (all assets are CC0, https://polyhaven.com/license)"""
import json, os, sys, urllib.request
ROOT = os.path.join(os.path.dirname(__file__), "..", "web", "public", "assets", "3d")
UA = {"User-Agent": "TheGroundTruth/1.0 (hackathon; asset fetch)"}
MODELS = ["modern_arm_chair_01", "metal_office_desk", "WoodenTable_02", "potted_plant_01", "potted_plant_02", "pachira_aquatica_01",
          "wooden_display_shelves_01", "book_encyclopedia_set_01", "decorative_book_set_01", "binder_notebook", "modern_ceiling_lamp_01",
          "desk_lamp_arm_01", "hanging_picture_frame_02", "wall_clock", "office_notepads", "sofa_02", "coffee_table_round_01", "mid_century_lounge_chair"]
TEXTURES = ["herringbone_parquet", "painted_plaster_wall", "beige_wall_001", "oak_veneer_01"]
HDRI = "canary_wharf"

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: return r.read()
def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True); open(path, "wb").write(data)

credits = []
for m in MODELS:
    try:
        f = json.loads(get(f"https://api.polyhaven.com/files/{m}"))["gltf"]["1k"]["gltf"]
        base = os.path.join(ROOT, "models", m)
        save(os.path.join(base, f"{m}.gltf"), get(f["url"]))
        for rel, inc in f.get("include", {}).items(): save(os.path.join(base, rel), get(inc["url"]))
        credits.append(m); print("model", m, flush=True)
    except Exception as e: print("FAIL model", m, e, flush=True)
for t in TEXTURES:
    try:
        f = json.loads(get(f"https://api.polyhaven.com/files/{t}"))
        for key, out in [("Diffuse", "diff"), ("nor_gl", "nor"), ("Rough", "rough")]:
            save(os.path.join(ROOT, "textures", t, f"{out}.jpg"), get(f[key]["1k"]["jpg"]["url"]))
        credits.append(t); print("texture", t, flush=True)
    except Exception as e: print("FAIL texture", t, e, flush=True)
try:
    f = json.loads(get(f"https://api.polyhaven.com/files/{HDRI}"))
    save(os.path.join(ROOT, "hdri", f"{HDRI}_2k.hdr"), get(f["hdri"]["2k"]["hdr"]["url"]))
    credits.append(HDRI); print("hdri", HDRI, flush=True)
except Exception as e: print("FAIL hdri", e, flush=True)
save(os.path.join(ROOT, "CREDITS.md"), ("# 3D assets\n\nAll assets from [Poly Haven](https://polyhaven.com), licensed **CC0** (public domain).\n\n" + "\n".join(f"- [{a}](https://polyhaven.com/a/{a})" for a in credits) + "\n").encode())
