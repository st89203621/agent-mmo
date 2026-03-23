import Phaser from 'phaser';

/** 地图配置 */
const TILE = 40;
const MAP_COLS = 20;
const MAP_ROWS = 15;
const PLAYER_SPEED = 160;

/** NPC标记点 */
export interface SceneNpc {
  npcId: string;
  npcName: string;
  col: number;
  row: number;
  color: number;
}

/** 场景事件回调 */
export interface SceneCallbacks {
  onNpcInteract: (npcId: string) => void;
  onPositionChange: (col: number, row: number) => void;
}

/** 简单地图数据：0=地面 1=障碍 2=装饰 */
function generateMap(): number[][] {
  const map: number[][] = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      // 边界为障碍
      if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
        row.push(1);
      } else if (Math.random() < 0.08) {
        row.push(1); // 随机障碍
      } else if (Math.random() < 0.05) {
        row.push(2); // 装饰
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  // 确保玩家出生点畅通
  map[3][3] = 0;
  map[3][4] = 0;
  map[4][3] = 0;
  return map;
}

const GROUND_COLORS = [0x3d3526, 0x3a3223, 0x413828];
const OBSTACLE_COLOR = 0x5c4a2a;
const DECOR_COLOR = 0x4a6b35;

export default class ExploreScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private obstacles: Phaser.GameObjects.Rectangle[] = [];
  private npcSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private mapData: number[][] = [];
  private callbacks: SceneCallbacks | null = null;
  private npcs: SceneNpc[] = [];
  private interactHint: Phaser.GameObjects.Text | null = null;
  private nearestNpc: string | null = null;
  // 虚拟摇杆
  private joystickBase: Phaser.GameObjects.Arc | null = null;
  private joystickThumb: Phaser.GameObjects.Arc | null = null;
  private joystickActive = false;
  private joystickVec = { x: 0, y: 0 };

  constructor() {
    super({ key: 'ExploreScene' });
  }

  init(data: { npcs: SceneNpc[]; callbacks: SceneCallbacks }) {
    this.npcs = data.npcs || [];
    this.callbacks = data.callbacks || null;
  }

  create() {
    this.mapData = generateMap();

    // 绘制地图
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const x = c * TILE + TILE / 2;
        const y = c * TILE + TILE / 2 + 48; // 顶部留出UI空间
        const cell = this.mapData[r][c];
        if (cell === 1) {
          const obs = this.add.rectangle(x, r * TILE + TILE / 2 + 48, TILE - 1, TILE - 1, OBSTACLE_COLOR);
          this.obstacles.push(obs);
        } else if (cell === 2) {
          this.add.rectangle(x, r * TILE + TILE / 2 + 48, TILE - 1, TILE - 1, DECOR_COLOR, 0.6);
        } else {
          const color = GROUND_COLORS[Math.floor(Math.random() * GROUND_COLORS.length)];
          this.add.rectangle(x, r * TILE + TILE / 2 + 48, TILE - 1, TILE - 1, color);
        }
      }
    }

    // 放置NPC
    for (const npc of this.npcs) {
      // 确保NPC位置没有障碍
      if (this.mapData[npc.row]?.[npc.col] !== undefined) {
        this.mapData[npc.row][npc.col] = 0;
      }
      const nx = npc.col * TILE + TILE / 2;
      const ny = npc.row * TILE + TILE / 2 + 48;

      const body = this.add.rectangle(0, 0, TILE - 4, TILE - 4, npc.color);
      const label = this.add.text(0, -TILE / 2 - 6, npc.npcName, {
        fontSize: '10px',
        color: '#c9a84c',
        fontFamily: 'inherit',
      }).setOrigin(0.5);

      const container = this.add.container(nx, ny, [body, label]);
      this.npcSprites.set(npc.npcId, container);
    }

    // 玩家
    const px = 3 * TILE + TILE / 2;
    const py = 3 * TILE + TILE / 2 + 48;
    this.player = this.add.rectangle(px, py, TILE - 6, TILE - 6, 0xc9a84c);
    this.player.setDepth(10);

    // 键盘控制
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // 交互提示
    this.interactHint = this.add.text(0, 0, '按空格/点击交互', {
      fontSize: '11px',
      color: '#c9a84c',
      backgroundColor: '#1a1610cc',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setVisible(false).setDepth(20);

    // 空格交互
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.nearestNpc) {
        this.callbacks?.onNpcInteract(this.nearestNpc);
      }
    });

    // 虚拟摇杆（移动端）
    this.createJoystick();
  }

  private createJoystick() {
    const cam = this.cameras.main;
    const baseX = 70;
    const baseY = cam.height - 70;

    this.joystickBase = this.add.circle(baseX, baseY, 40, 0xffffff, 0.15)
      .setScrollFactor(0).setDepth(50);
    this.joystickThumb = this.add.circle(baseX, baseY, 18, 0xc9a84c, 0.5)
      .setScrollFactor(0).setDepth(51);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 只对屏幕下半部分激活摇杆
      if (pointer.y > cam.height * 0.5) {
        this.joystickActive = true;
        this.joystickBase!.setPosition(pointer.x, pointer.y);
        this.joystickThumb!.setPosition(pointer.x, pointer.y);
      } else {
        // 上半部分点击 = 尝试NPC交互
        if (this.nearestNpc) {
          this.callbacks?.onNpcInteract(this.nearestNpc);
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.joystickActive || !this.joystickBase) return;
      const dx = pointer.x - this.joystickBase.x;
      const dy = pointer.y - this.joystickBase.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 40;
      const clampDist = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);

      this.joystickThumb!.setPosition(
        this.joystickBase.x + Math.cos(angle) * clampDist,
        this.joystickBase.y + Math.sin(angle) * clampDist,
      );

      if (dist > 8) {
        this.joystickVec = { x: Math.cos(angle), y: Math.sin(angle) };
      } else {
        this.joystickVec = { x: 0, y: 0 };
      }
    });

    this.input.on('pointerup', () => {
      this.joystickActive = false;
      this.joystickVec = { x: 0, y: 0 };
      if (this.joystickBase && this.joystickThumb) {
        this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
      }
    });
  }

  update(_time: number, delta: number) {
    if (!this.player) return;
    const dt = delta / 1000;
    let vx = 0;
    let vy = 0;

    // 键盘
    if (this.cursors) {
      if (this.cursors.left.isDown) vx = -1;
      else if (this.cursors.right.isDown) vx = 1;
      if (this.cursors.up.isDown) vy = -1;
      else if (this.cursors.down.isDown) vy = 1;
    }

    // 摇杆覆盖
    if (this.joystickActive) {
      vx = this.joystickVec.x;
      vy = this.joystickVec.y;
    }

    // 归一化
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
    }

    const newX = this.player.x + vx * PLAYER_SPEED * dt;
    const newY = this.player.y + vy * PLAYER_SPEED * dt;

    // 碰撞检测
    if (!this.isBlocked(newX, newY)) {
      this.player.x = newX;
      this.player.y = newY;
    } else if (!this.isBlocked(newX, this.player.y)) {
      this.player.x = newX;
    } else if (!this.isBlocked(this.player.x, newY)) {
      this.player.y = newY;
    }

    // 通知位置
    const col = Math.floor(this.player.x / TILE);
    const row = Math.floor((this.player.y - 48) / TILE);
    this.callbacks?.onPositionChange(col, row);

    // NPC接近检测
    this.nearestNpc = null;
    let minDist = Infinity;
    for (const npc of this.npcs) {
      const container = this.npcSprites.get(npc.npcId);
      if (!container) continue;
      const dx = this.player.x - container.x;
      const dy = this.player.y - container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < TILE * 1.8 && dist < minDist) {
        minDist = dist;
        this.nearestNpc = npc.npcId;
      }
    }

    if (this.interactHint) {
      if (this.nearestNpc) {
        const container = this.npcSprites.get(this.nearestNpc);
        if (container) {
          this.interactHint.setPosition(container.x, container.y - TILE - 8);
          this.interactHint.setVisible(true);
        }
      } else {
        this.interactHint.setVisible(false);
      }
    }
  }

  private isBlocked(x: number, y: number): boolean {
    const col = Math.floor(x / TILE);
    const row = Math.floor((y - 48) / TILE);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return true;
    return this.mapData[row]?.[col] === 1;
  }
}
