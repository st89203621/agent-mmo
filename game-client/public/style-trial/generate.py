"""
批量调用 ComfyUI 生成 12 套风格试色图（仙侠主城远景）。
按 application.properties 中 flux2 pipeline 配置构建 workflow。
"""
import json
import os
import sys
import time
import uuid
import urllib.request
import urllib.parse

BASE = "http://192.168.22.31:8199"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# flux2 模型配置（与 application.properties 对齐）
CFG = {
    "diffusion_model": "flux-2-klein-9b-fp8.safetensors",
    "text_encoder": "qwen_3_8b_fp8mixed.safetensors",
    "vae": "flux2-vae.safetensors",
    "sampler": "euler",
    "scheduler": "simple",
    "steps": 4,
    "cfg": 1.0,
    "weight_dtype": "fp8_e4m3fn",
    "width": 768,
    "height": 1280,
}

COMMON = "仙侠主城远景构图，前景楼阁飞檐，中景街市行人灯笼，远景山峦云雾；高质量CG插画，细节丰富，竖屏构图，画面留白适当用作UI背景"

STYLES = [
    ("01_樱花暮春", "仙侠主城被樱花林环绕，飞瓣随风飘舞，整体粉白柔光、米色调、淡薄荷点缀，朝霞淡粉，温柔治愈感，少女气质，画面通透不沉闷"),
    ("02_海棠胭脂", "黄昏时分仙侠主城，胭脂粉红与海棠红霞光铺满天空，灯笼初亮泛暖黄，红与粉为主调、辅以一点暖金，温暖鲜明但不刺眼"),
    ("03_暮霞橘金", "日落仙侠主城，橘红云霞、暖金阳光洒满飞檐，街市灯笼初亮，金色屋脊反光，色调饱满活泼，温暖喜悦"),
    ("04_杏黄姜金", "晨曦中的仙侠主城，温暖的杏黄、淡姜金、米白主调，柔光通透明亮，远山带薄雾微紫，活泼清新，希望感"),
    ("05_桃花春日", "桃花盛开的仙侠主城，粉桃、嫩绿、浅鹅黄三色平衡，蝴蝶飞舞，少女感与灵动甜美，画风明快不腻"),
    ("06_紫藤暮色", "紫藤花瀑垂落的主城屋檐，暮紫、藕荷、桃粉、淡金交融，朦胧光影梦幻感，温柔不冷艳"),
    ("07_月白青瓷", "月色清辉下的仙侠主城，月白、淡青瓷、银灰主调，灯笼暖黄点缀作冷暖对比，雅致温柔，国风水墨气质"),
    ("08_鎏金檀木", "夜晚仙侠主城，深檀木暗红、朱砂、暖金灯笼光，高对比奢华古典，灯火通明热闹但不杂乱"),
    ("09_烟花霓虹", "节庆夜景仙侠主城，天空烟花绽放粉红与暖金，灯笼成串璀璨，人群熙攘，活泼喜庆鲜亮，浓郁春节氛围"),
    ("10_青苔江南", "江南水乡仙侠主城，白墙黑瓦、青苔翠绿、粉桃花点缀，小桥流水，水墨工笔风，清新淡雅活泼"),
    ("11_蜜糖马卡龙", "卡通圆润仙侠主城，奶油黄、薄荷绿、桃粉、天蓝马卡龙配色，Q萌可爱，矢量插画感，灵动活泼少女向"),
    ("12_流光琉璃", "仙侠主城笼罩流光琉璃光晕，淡金、浅紫、樱粉、薄荷绿多色柔光透视，光斑漂浮，梦幻通透，鲜明温柔兼具"),
]


def build_workflow(prompt: str, seed: int) -> dict:
    p = {}
    p["1"] = {"class_type": "UNETLoader", "inputs": {
        "unet_name": CFG["diffusion_model"], "weight_dtype": CFG["weight_dtype"]}}
    p["2"] = {"class_type": "CLIPLoader", "inputs": {
        "clip_name": CFG["text_encoder"], "type": "flux2"}}
    p["3"] = {"class_type": "VAELoader", "inputs": {"vae_name": CFG["vae"]}}
    p["4"] = {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["2", 0]}}
    p["5"] = {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["2", 0]}}
    p["latent_src"] = {"class_type": "EmptyLatentImage", "inputs": {
        "width": CFG["width"], "height": CFG["height"], "batch_size": 1}}
    p["7"] = {"class_type": "KSampler", "inputs": {
        "seed": seed, "steps": CFG["steps"], "cfg": CFG["cfg"],
        "sampler_name": CFG["sampler"], "scheduler": CFG["scheduler"], "denoise": 1.0,
        "model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0],
        "latent_image": ["latent_src", 0]}}
    p["8"] = {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}}
    p["9"] = {"class_type": "SaveImage", "inputs": {"filename_prefix": "trial", "images": ["8", 0]}}
    return {"prompt": p, "client_id": "trial-" + uuid.uuid4().hex}


def post_prompt(workflow: dict) -> str:
    data = json.dumps(workflow).encode("utf-8")
    req = urllib.request.Request(BASE + "/prompt", data=data,
                                  headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())["prompt_id"]


def wait_history(prompt_id: str, timeout_sec: int = 300) -> dict:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(BASE + "/history/" + prompt_id, timeout=10) as r:
                hist = json.loads(r.read())
                entry = hist.get(prompt_id)
                if entry and entry.get("status", {}).get("completed"):
                    return entry
        except Exception:
            pass
        time.sleep(0.8)
    raise TimeoutError("生成超时 " + prompt_id)


def download_view(filename: str, subfolder: str, type_: str) -> bytes:
    qs = urllib.parse.urlencode({
        "filename": filename, "subfolder": subfolder or "", "type": type_ or "output"})
    with urllib.request.urlopen(BASE + "/view?" + qs, timeout=30) as r:
        return r.read()


def generate_one(label: str, prompt_text: str) -> str:
    full_prompt = prompt_text + "。" + COMMON
    seed = int.from_bytes(os.urandom(7), "big")
    workflow = build_workflow(full_prompt, seed)
    pid = post_prompt(workflow)
    print(f"[{label}] prompt_id={pid}", flush=True)
    entry = wait_history(pid)
    outputs = entry.get("outputs", {})
    saved_path = None
    for node_id, node in outputs.items():
        for img in node.get("images", []) or []:
            blob = download_view(img["filename"], img.get("subfolder", ""), img.get("type", "output"))
            out_file = os.path.join(OUT_DIR, label + ".png")
            with open(out_file, "wb") as f:
                f.write(blob)
            saved_path = out_file
            break
        if saved_path:
            break
    print(f"[{label}] saved -> {saved_path}", flush=True)
    return saved_path


def main():
    print(f"输出目录: {OUT_DIR}", flush=True)
    print(f"ComfyUI: {BASE}", flush=True)
    success = []
    failed = []
    for label, prompt in STYLES:
        try:
            path = generate_one(label, prompt)
            success.append((label, path))
        except Exception as e:
            print(f"[{label}] FAILED: {e}", flush=True)
            failed.append((label, str(e)))
    print("\n=== 完成 ===", flush=True)
    print(f"成功: {len(success)}/{len(STYLES)}", flush=True)
    for label, path in success:
        print(f"  ✓ {label} -> {path}", flush=True)
    if failed:
        print(f"失败: {len(failed)}", flush=True)
        for label, err in failed:
            print(f"  ✗ {label}: {err}", flush=True)


if __name__ == "__main__":
    main()
