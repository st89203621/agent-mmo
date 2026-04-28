// 直接调本地 ComfyUI 生成三页 UI 设计稿
// 复用项目 application.properties 的 flux2 工作流参数
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const COMFY = process.env.COMFY_URL || 'http://192.168.22.31:8199';
const OUT = resolve('screenshots');
const W = 832, H = 1248; // 手机竖版 2:3

// flux2 工作流参数（与 application.properties 对齐）
const CFG = {
  unet: 'flux-2-klein-9b-fp8.safetensors',
  clip: 'qwen_3_8b_fp8mixed.safetensors',
  vae: 'flux2-vae.safetensors',
  weightDtype: 'fp8_e4m3fn',
  sampler: 'euler',
  scheduler: 'simple',
  steps: 6,
  cfg: 3.5,
  negative: 'photo, photorealistic, 3d render, blurry, lowres, deformed, extra fingers, watermark, signature, ugly, oversaturated, plastic',
};

const TASKS = [
  {
    key: 'trade',
    prompt:
      'high-end mobile UI mockup screen for chinese xianxia MMO marketplace, vertical phone aspect, ' +
      'top dark wood appbar with gold serif chinese title "集市" and gold counter "金币 12,450", ' +
      'horizontal pill category tabs in elegant gold strokes, ' +
      'red and gold "我的小摊 营业中" highlight panel with ornate gold border, ' +
      'list of trading stalls each with circular avatar, seller name in chinese serif, ' +
      'item name and gold price, gold "买" round button on right, ' +
      'dark navy and ink-wash background with subtle bamboo and lantern motifs, ' +
      'gold dividers and floating dark glass cards, ' +
      'chinese xianxia game ui design, refined visual hierarchy, ornate but readable, ' +
      'typography heavy, traditional chinese serif font, figma quality flat design mockup',
  },
  {
    key: 'inventory',
    prompt:
      'high-end mobile UI mockup screen for chinese xianxia MMO inventory, vertical phone aspect, ' +
      'top dark wood appbar with gold serif chinese title "背包" and subtitle "道具 装备", ' +
      'horizontal tabs (全部 装备 丹药 材料 宝宝 其他) in gold strokes, ' +
      'capacity bar showing "容量 8/40" with gold gradient fill, ' +
      '5x5 grid of dark stone item slots with gold borders, ' +
      'each filled slot shows colorful item icon with rarity glow (red heart pill, blue gem ring, jade sword, purple armor), ' +
      'empty slots are dim with subtle gold corner brackets, ' +
      'selected item detail panel at bottom with gold name and stat icons, ' +
      'dark navy and ink-wash background with treasure chest motif faintly visible, ' +
      'chinese xianxia game ui design, refined visual hierarchy, ornate but readable, ' +
      'typography heavy, traditional chinese serif font, figma quality flat design mockup',
  },
  {
    key: 'quest',
    prompt:
      'high-end mobile UI mockup screen for chinese xianxia MMO quest log, vertical phone aspect, ' +
      'top dark wood appbar with gold serif chinese title "任务" and progress "今日 2/3", ' +
      'horizontal tabs (主线 活跃 卷轴 成就) with red dot count badges, ' +
      'daily progress card showing gold gradient bar 67% filled with "快进全部 20 玩币" red button, ' +
      'list of quest scroll cards each with gold seal icon, quest name in chinese serif, ' +
      'description, golden progress bar (3/5), reward "奖励 50经验 灵石x3", and gold "前往" button, ' +
      'main quest card has red ribbon accent, completed card has jade green check, ' +
      'dark wood and ink-wash background with hanging silk scroll motifs faintly visible, ' +
      'chinese xianxia game ui design, refined visual hierarchy, ornate but readable, ' +
      'typography heavy, traditional chinese serif font, figma quality flat design mockup',
  },
];

const wfFlux2 = (prompt, seed) => ({
  '1': { class_type: 'UNETLoader', inputs: { unet_name: CFG.unet, weight_dtype: CFG.weightDtype } },
  '2': { class_type: 'CLIPLoader', inputs: { clip_name: CFG.clip, type: 'flux2' } },
  '3': { class_type: 'VAELoader', inputs: { vae_name: CFG.vae } },
  '4': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['2', 0] } },
  '5': { class_type: 'CLIPTextEncode', inputs: { text: CFG.negative, clip: ['2', 0] } },
  '6': { class_type: 'EmptyLatentImage', inputs: { width: W, height: H, batch_size: 1 } },
  '7': { class_type: 'KSampler', inputs: {
    seed, steps: CFG.steps, cfg: CFG.cfg,
    sampler_name: CFG.sampler, scheduler: CFG.scheduler, denoise: 1.0,
    model: ['1', 0], positive: ['4', 0], negative: ['5', 0], latent_image: ['6', 0],
  } },
  '8': { class_type: 'VAEDecode', inputs: { samples: ['7', 0], vae: ['3', 0] } },
  '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'design_mock', images: ['8', 0] } },
});

const post = async (path, body) => {
  const r = await fetch(COMFY + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} HTTP ${r.status}`);
  return r.json();
};

const get = async (path) => {
  const r = await fetch(COMFY + path);
  if (!r.ok) throw new Error(`GET ${path} HTTP ${r.status}`);
  return r;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(task) {
  const seed = Math.floor(Math.random() * 1e15);
  const wf = wfFlux2(task.prompt, seed);
  const start = Date.now();

  const { prompt_id } = await post('/prompt', { prompt: wf, client_id: 'mmo-design-' + seed });
  process.stdout.write(`[${task.key}] queued prompt_id=${prompt_id.slice(0, 8)}… `);

  // 轮询 history
  let history = null;
  for (let i = 0; i < 600; i++) {
    const r = await get('/history/' + prompt_id);
    const j = await r.json();
    const entry = j[prompt_id];
    if (entry && entry.status && entry.status.completed) { history = entry; break; }
    await sleep(500);
  }
  if (!history) throw new Error('timeout');

  const outputs = history.outputs || {};
  for (const nid of Object.keys(outputs)) {
    const imgs = outputs[nid].images || [];
    for (const img of imgs) {
      const url = `/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`;
      const r = await get(url);
      const buf = Buffer.from(await r.arrayBuffer());
      const out = `${OUT}/mock-${task.key}.png`;
      writeFileSync(out, buf);
      const sec = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`done ${sec}s -> ${out}`);
      return;
    }
  }
  throw new Error('no images in history');
}

(async () => {
  console.log(`COMFY=${COMFY}  out=${OUT}  size=${W}x${H}  pipeline=flux2`);
  for (const t of TASKS) {
    try { await generate(t); }
    catch (e) { console.error(`[${t.key}] FAIL:`, e.message); }
  }
})();
