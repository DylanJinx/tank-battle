// 游戏参数
const TILE_SIZE = 40; // 坦克和墙块的大小
let ROWS = 15; // 默认值，会在初始化时根据canvas高度重新计算
let COLS = 20; // 默认值，会在初始化时根据canvas宽度重新计算

const PLAYER_SPEED = 5; // 调整坦克移动速度为适中的值
const ENEMY_SPEED = 2;
const BULLET_SPEED = 8;
const ENEMY_COUNT = 3;
const PLAYER_COLOR = "#34c759"; // Apple绿色
const ENEMY_COLOR = "#ff3b30"; // Apple红色
const BULLET_COLOR = "#ffffff"; // 白色子弹
const WALL_COLOR = "#8e8e93"; // Apple灰色

// 性能控制
let lastFrameTime = 0;
let fpsCounter = 0;
let fpsTimer = 0;
let currentFps = 0;

// 粒子效果
const PARTICLES: Particle[] = [];
const PARTICLE_COUNT = 15;
const PARTICLE_LIFETIME = 30;

// 游戏状态
let gameState = "playing"; // playing, paused, gameOver, victory
let player: Tank | null = null;
let enemies: Tank[] = [];
let bullets: Bullet[] = [];
let walls: Wall[] = [];
const keysPressed: { [key: string]: boolean } = {}; // 记录按下的按键
let animationFrameId: number | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let canvas: HTMLCanvasElement | null = null;

// --- 类定义 ---

// 游戏对象基类
class GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
  }

  draw() {
    if (!ctx) return;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  isCollidingWith(other: GameObject) {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
}

class Tank extends GameObject {
  speed: number;
  direction: string;
  shootCooldown: number;
  shootDelay: number;
  lastX: number;
  lastY: number;
  animationProgress: number;

  constructor(x: number, y: number, color: string, speed: number) {
    super(x, y, TILE_SIZE, TILE_SIZE, color);
    this.speed = speed;
    this.direction = "up"; // 'up', 'down', 'left', 'right'
    this.shootCooldown = 0;
    this.shootDelay = 20; // 降低射击延迟提高流畅度
    this.lastX = x; // 用于平滑移动
    this.lastY = y; // 用于平滑移动
    this.animationProgress = 0; // 动画进度
  }

  move(dx: number, dy: number): boolean {
    // 如果没有实际移动，直接返回
    if (dx === 0 && dy === 0) {
      return false;
    }

    // 计算新位置
    const newX = this.x + dx;
    const newY = this.y + dy;

    // 边界检测 - 确保不会移出画布
    if (
      newX < 0 ||
      newX + this.width > (canvas?.width || 0) ||
      newY < 0 ||
      newY + this.height > (canvas?.height || 0)
    ) {
      // 如果要移出边界，返回false
      return false;
    }

    // 准备一个临时对象来进行碰撞检测
    const tempTank = {
      x: newX,
      y: newY,
      width: this.width,
      height: this.height,
    };

    // 检查与墙壁的碰撞
    for (const wall of walls) {
      if (this.isCollidingWithRect(tempTank, wall)) {
        return false;
      }
    }

    // 检查与其他坦克的碰撞
    if (this.color === PLAYER_COLOR) {
      // 玩家坦克与敌人坦克的碰撞
      for (const enemy of enemies) {
        if (this.isCollidingWithRect(tempTank, enemy)) {
          return false;
        }
      }
    } else {
      // 敌人坦克与玩家坦克的碰撞
      if (player && this.isCollidingWithRect(tempTank, player)) {
        return false;
      }

      // 敌人坦克与其他敌人坦克的碰撞
      for (const enemy of enemies) {
        if (enemy !== this && this.isCollidingWithRect(tempTank, enemy)) {
          return false;
        }
      }
    }

    // 如果通过了所有碰撞检测，则更新坦克位置
    this.lastX = this.x;
    this.lastY = this.y;
    this.x = newX;
    this.y = newY;
    this.animationProgress = 0;

    if (TEST_MODE) {
      console.log(
        `移动成功: 从(${this.lastX},${this.lastY})到(${this.x},${this.y})`
      );
    }

    // 成功移动，返回true
    return true;
  }

  // 使用矩形碰撞检测，返回两个矩形是否重叠
  isCollidingWithRect(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean {
    // 计算两个矩形边界
    const left1 = rect1.x;
    const right1 = rect1.x + rect1.width;
    const top1 = rect1.y;
    const bottom1 = rect1.y + rect1.height;

    const left2 = rect2.x;
    const right2 = rect2.x + rect2.width;
    const top2 = rect2.y;
    const bottom2 = rect2.y + rect2.height;

    // 标准的AABB矩形碰撞检测
    return left1 < right2 && right1 > left2 && top1 < bottom2 && bottom1 > top2;
  }

  shoot() {
    if (this.shootCooldown <= 0) {
      let bulletX = this.x + this.width / 2 - TILE_SIZE / 8;
      let bulletY = this.y + this.height / 2 - TILE_SIZE / 8;
      let bulletDX = 0;
      let bulletDY = 0;

      switch (this.direction) {
        case "up":
          bulletDY = -BULLET_SPEED;
          bulletY = this.y - TILE_SIZE / 4;
          break;
        case "down":
          bulletDY = BULLET_SPEED;
          bulletY = this.y + this.height;
          break;
        case "left":
          bulletDX = -BULLET_SPEED;
          bulletX = this.x - TILE_SIZE / 4;
          break;
        case "right":
          bulletDX = BULLET_SPEED;
          bulletX = this.x + this.width;
          break;
      }
      bullets.push(
        new Bullet(bulletX, bulletY, bulletDX, bulletDY, this.color)
      );
      this.shootCooldown = this.shootDelay;
    }
  }

  update() {
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    // 平滑移动动画 - 增加速度以确保动画更流畅
    this.animationProgress = Math.min(1, this.animationProgress + 0.3);
  }

  draw() {
    if (!ctx) return;
    // 绘制坦克主体，稍带圆角
    ctx.save();
    ctx.fillStyle = this.color;

    // 绘制圆角矩形
    const radius = 5;
    const x = this.x;
    const y = this.y;
    const width = this.width;
    const height = this.height;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // 坦克细节
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 3, 0, Math.PI * 2);
    ctx.fill();

    // 画出炮管
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    const barrelWidth = TILE_SIZE / 4;
    const barrelLength = TILE_SIZE / 1.5;
    let barrelX, barrelY;

    switch (this.direction) {
      case "up":
        barrelX = this.x + this.width / 2 - barrelWidth / 2;
        barrelY = this.y - barrelLength + barrelWidth; // slight offset to appear more on top

        ctx.beginPath();
        ctx.rect(barrelX, barrelY, barrelWidth, barrelLength);
        ctx.fill();
        break;
      case "down":
        barrelX = this.x + this.width / 2 - barrelWidth / 2;
        barrelY = this.y + this.height - barrelWidth; // slight offset

        ctx.beginPath();
        ctx.rect(barrelX, barrelY, barrelWidth, barrelLength);
        ctx.fill();
        break;
      case "left":
        barrelX = this.x - barrelLength + barrelWidth; //slight offset
        barrelY = this.y + this.height / 2 - barrelWidth / 2;

        ctx.beginPath();
        ctx.rect(barrelX, barrelY, barrelLength, barrelWidth);
        ctx.fill();
        break;
      case "right":
        barrelX = this.x + this.width - barrelWidth; //slight offset
        barrelY = this.y + this.height / 2 - barrelWidth / 2;

        ctx.beginPath();
        ctx.rect(barrelX, barrelY, barrelLength, barrelWidth);
        ctx.fill();
        break;
    }

    ctx.restore();
  }
}

class Bullet extends GameObject {
  dx: number;
  dy: number;
  ownerColor: string;
  trailPoints: { x: number; y: number }[];

  constructor(
    x: number,
    y: number,
    dx: number,
    dy: number,
    ownerColor: string
  ) {
    super(x, y, TILE_SIZE / 4, TILE_SIZE / 4, BULLET_COLOR);
    this.dx = dx;
    this.dy = dy;
    this.ownerColor = ownerColor; // 用于区分是谁的子弹
    this.trailPoints = []; // 用于子弹尾迹
  }

  update() {
    // 保存上一个位置用于尾迹效果
    this.trailPoints.unshift({ x: this.x, y: this.y });
    if (this.trailPoints.length > 5) {
      this.trailPoints.pop();
    }

    this.x += this.dx;
    this.y += this.dy;
  }

  draw() {
    if (!ctx) return;
    // 绘制子弹尾迹
    for (let i = 0; i < this.trailPoints.length; i++) {
      const point = this.trailPoints[i];
      const alpha = 0.5 * (1 - i / this.trailPoints.length);

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(
        point.x + this.width / 2,
        point.y + this.height / 2,
        (this.width / 2) * (1 - i / this.trailPoints.length),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 绘制子弹主体
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 添加光晕效果
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 1.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

class Wall extends GameObject {
  constructor(x: number, y: number) {
    super(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, WALL_COLOR);

    // 调试信息
    console.log(`创建墙块: 位置(${this.x}, ${this.y})`);
  }

  draw() {
    if (!ctx) return;
    // 绘制圆角矩形
    const radius = 4;
    const x = this.x;
    const y = this.y;
    const width = this.width;
    const height = this.height;

    ctx.save();
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // 添加墙砖纹理
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    const brickSize = TILE_SIZE / 4;

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(
            x + i * brickSize,
            y + j * brickSize,
            brickSize,
            brickSize
          );
        }
      }
    }

    // 添加高光效果
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(x, y, width, 2);
    ctx.fillRect(x, y, 2, height);

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  life: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 3 + 2;
    this.speedX = Math.random() * 6 - 3;
    this.speedY = Math.random() * 6 - 3;
    this.color = color;
    this.life = PARTICLE_LIFETIME;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.speedX *= 0.95;
    this.speedY *= 0.95;
    this.life--;
  }

  draw() {
    if (!ctx) return;
    const alpha = this.life / PARTICLE_LIFETIME;
    const r = parseInt(this.color.slice(1, 3), 16);
    const g = parseInt(this.color.slice(3, 5), 16);
    const b = parseInt(this.color.slice(5, 7), 16);

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- 游戏逻辑 ---
export // 调试函数 - 检查坦克是否被墙壁包围
function checkTankSurroundings(tank: Tank | null, label: string) {
  if (!tank) return;

  const directions = [
    { dx: 0, dy: -tank.speed, name: "上" },
    { dx: 0, dy: tank.speed, name: "下" },
    { dx: -tank.speed, dy: 0, name: "左" },
    { dx: tank.speed, dy: 0, name: "右" },
  ];

  console.log(`检查${label}周围状态:`);

  let hasFreeDirection = false;
  for (const dir of directions) {
    // 模拟朝这个方向移动
    const testX = tank.x + (dir.dx || 0);
    const testY = tank.y + (dir.dy || 0);

    // 检查是否能移动
    let canMove = true;

    // 边界检测
    if (
      testX < 0 ||
      testX + tank.width > (canvas?.width || 0) ||
      testY < 0 ||
      testY + tank.height > (canvas?.height || 0)
    ) {
      canMove = false;
    }

    // 墙壁碰撞检测
    if (canMove) {
      for (const wall of walls) {
        if (
          testX < wall.x + wall.width &&
          testX + tank.width > wall.x &&
          testY < wall.y + wall.height &&
          testY + tank.height > wall.y
        ) {
          canMove = false;
          break;
        }
      }
    }

    console.log(`  ${dir.name}方向: ${canMove ? "可以移动" : "被阻挡"}`);
    hasFreeDirection = hasFreeDirection || canMove;
  }

  console.log(`${label}${hasFreeDirection ? "有" : "没有"}可移动方向!`);
  return hasFreeDirection;
}

export function initGame(canvasElement: HTMLCanvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext("2d");

  if (!ctx || !canvas) return;

  // 计算行列数
  ROWS = canvas.height / TILE_SIZE;
  COLS = canvas.width / TILE_SIZE;

  // 清空按键状态，确保没有残留的按键状态
  for (const key in keysPressed) {
    keysPressed[key] = false;
  }

  // 重置游戏状态
  gameState = "playing";

  // 创建玩家 - 保证有足够的移动空间
  const playerX = TILE_SIZE * Math.floor(COLS / 2);
  const playerY = TILE_SIZE * (ROWS - 3); // 稍微上移一格，确保与底部墙壁有空间

  console.log(
    `创建玩家坦克: 位置(${playerX}, ${playerY}), 地图大小: ${COLS}x${ROWS}`
  );

  player = new Tank(playerX, playerY, PLAYER_COLOR, PLAYER_SPEED);

  // 创建敌人
  enemies = [];
  for (let i = 0; i < ENEMY_COUNT; i++) {
    let enemyX, enemyY;
    let validPosition = false;
    while (!validPosition) {
      enemyX = TILE_SIZE * Math.floor(Math.random() * COLS);
      enemyY = TILE_SIZE * Math.floor(Math.random() * (ROWS / 2)); // 敌人出生在上半区
      const potentialEnemy = new Tank(enemyX, enemyY, ENEMY_COLOR, ENEMY_SPEED);
      validPosition = true;
      if (potentialEnemy.isCollidingWith(player)) {
        validPosition = false;
        continue;
      }
      for (const wall of walls) {
        if (potentialEnemy.isCollidingWith(wall)) {
          validPosition = false;
          break;
        }
      }
    }
    enemies.push(new Tank(enemyX!, enemyY!, ENEMY_COLOR, ENEMY_SPEED));
  }

  // 创建墙壁 (更好看的地图布局)
  walls = [];
  // 边缘墙壁，但确保玩家周围有空间可以移动
  const playerCenterX = Math.floor(COLS / 2);
  const playerBottom = ROWS - 2;

  // 边缘墙壁
  for (let i = 0; i < COLS; i++) {
    // 确保玩家周围至少留出3格的空间
    if (i % 3 !== 0 && Math.abs(i - playerCenterX) > 1) {
      walls.push(new Wall(i, 1)); // 顶部墙壁

      // 底部墙壁 - 确保玩家出生点周围没有墙
      if (Math.abs(i - playerCenterX) > 2) {
        walls.push(new Wall(i, ROWS - 2));
      }
    }
  }

  for (let j = 1; j < ROWS - 1; j++) {
    // 确保玩家周围留出空间
    if (j % 3 !== 0 && j < playerBottom - 2) {
      walls.push(new Wall(1, j)); // 左侧墙壁
      walls.push(new Wall(COLS - 2, j)); // 右侧墙壁
    }
  }

  console.log("创建墙壁完成，墙的数量:", walls.length);

  // 中央障碍物 - 减少数量并确保不会靠近玩家
  // 玩家出生位置在底部中央，确保底部区域有足够空间
  const obstaclePlayerCenterX = Math.floor(COLS / 2);
  const obstaclePlayerBottomY = ROWS - 2;

  const obstacles = [
    // 左上角障碍群
    [4, 4],
    [5, 4],
    [4, 5],

    // 右上角障碍群
    [COLS - 5, 4],
    [COLS - 6, 4],
    [COLS - 5, 5],

    // 中间小障碍 - 远离玩家初始位置
    [Math.floor(COLS / 2) - 3, Math.floor(ROWS / 2)],
    [Math.floor(COLS / 2) + 3, Math.floor(ROWS / 2)],
  ];

  // 添加障碍物，但要确保不会包围玩家
  for (const [x, y] of obstacles) {
    // 确保障碍物离玩家起始位置有一定距离
    if (
      Math.abs(x - obstaclePlayerCenterX) > 2 ||
      Math.abs(y - obstaclePlayerBottomY) > 2
    ) {
      walls.push(new Wall(x, y));
    }
  }

  // 放置一些随机障碍物，但远离玩家初始位置
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(Math.random() * (COLS - 4)) + 2;
    const y = Math.floor(Math.random() * (ROWS / 2 - 2)) + 2;

    // 确保障碍物不会包围玩家
    if (
      Math.abs(x - obstaclePlayerCenterX) > 3 &&
      y < obstaclePlayerBottomY - 3
    ) {
      walls.push(new Wall(x, y));
    }
  }

  console.log("障碍物创建完成，总墙数:", walls.length);

  bullets = [];

  // 设置键盘事件监听
  setupEventListeners();

  // 检查玩家坦克是否有可移动方向
  checkTankSurroundings(player, "玩家坦克");
}

function createExplosion(
  x: number,
  y: number,
  color: string,
  count = PARTICLE_COUNT
) {
  for (let i = 0; i < count; i++) {
    PARTICLES.push(new Particle(x, y, color));
  }
}

export function getEnemyCount() {
  return enemies.length;
}

export function getCurrentFps() {
  return currentFps;
}

function updateGame() {
  if (gameState !== "playing") return;

  // 先处理键盘输入，再更新玩家状态
  handleKeyboardInput();

  // 更新玩家
  if (player) {
    player.update();
  }

  // 更新敌人 (改进AI)
  enemies.forEach((enemy) => {
    enemy.update();

    // 敌人AI
    if (Math.random() < 0.02 && player) {
      // 追逐玩家的简单AI
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;

      // 决定移动方向
      if (Math.abs(dx) > Math.abs(dy)) {
        // 主要水平移动
        enemy.direction = dx > 0 ? "right" : "left";

        if (dx > 0) {
          enemy.move(enemy.speed, 0);
        } else {
          enemy.move(-enemy.speed, 0);
        }
      } else {
        // 主要垂直移动
        enemy.direction = dy > 0 ? "down" : "up";

        if (dy > 0) {
          enemy.move(0, enemy.speed);
        } else {
          enemy.move(0, -enemy.speed);
        }
      }
    }

    // 随机变换方向，防止卡住
    if (Math.random() < 0.01) {
      const directions = ["up", "down", "left", "right"];
      enemy.direction =
        directions[Math.floor(Math.random() * directions.length)];
    }

    // 射击概率 - 针对玩家方向提高概率
    if (player) {
      const inLineWithPlayer =
        (Math.abs(enemy.x - player.x) < TILE_SIZE &&
          enemy.direction === (enemy.y > player.y ? "up" : "down")) ||
        (Math.abs(enemy.y - player.y) < TILE_SIZE &&
          enemy.direction === (enemy.x > player.x ? "left" : "right"));

      if (Math.random() < (inLineWithPlayer ? 0.05 : 0.01)) {
        enemy.shoot();
      }
    }
  });

  // 更新子弹
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.update();

    // 子弹边界销毁
    if (
      bullet.x < 0 ||
      bullet.x > (canvas?.width || 0) ||
      bullet.y < 0 ||
      bullet.y > (canvas?.height || 0)
    ) {
      bullets.splice(i, 1);
      continue;
    }

    // 子弹墙壁碰撞
    let hitWall = false;
    for (let j = 0; j < walls.length; j++) {
      const wall = walls[j];
      if (bullet.isCollidingWith(wall)) {
        createExplosion(bullet.x, bullet.y, WALL_COLOR, 10);
        bullets.splice(i, 1);
        hitWall = true;
        break;
      }
    }
    if (hitWall) continue;

    // 子弹与坦克碰撞
    if (bullet.ownerColor === PLAYER_COLOR) {
      // 玩家的子弹
      for (let j = enemies.length - 1; j >= 0; j--) {
        if (bullet.isCollidingWith(enemies[j])) {
          createExplosion(
            enemies[j].x + TILE_SIZE / 2,
            enemies[j].y + TILE_SIZE / 2,
            ENEMY_COLOR
          );
          enemies.splice(j, 1); // 销毁敌人
          bullets.splice(i, 1); // 销毁子弹

          if (enemies.length === 0) {
            gameState = "victory";
            setTimeout(() => {
              alert("玩家胜利!");
              initGame(canvas!); // 重新开始
            }, 500);
          }
          break; // 子弹已处理，跳出内层循环
        }
      }
    } else {
      // 敌人的子弹
      if (player && bullet.isCollidingWith(player)) {
        createExplosion(
          player.x + TILE_SIZE / 2,
          player.y + TILE_SIZE / 2,
          PLAYER_COLOR
        );
        bullets.splice(i, 1); // 销毁子弹
        gameState = "gameOver";
        setTimeout(() => {
          alert("游戏结束!");
          initGame(canvas!); // 重新开始
        }, 500);
        return;
      }
    }
  }

  // 更新粒子效果
  for (let i = PARTICLES.length - 1; i >= 0; i--) {
    PARTICLES[i].update();
    if (PARTICLES[i].life <= 0) {
      PARTICLES.splice(i, 1);
    }
  }
}

// 基础移动速度常量，用于测试
let TEST_MODE = false; // 测试模式默认关闭
let TEST_AUTO_MOVE = false;
let TEST_DIRECTION_INDEX = 0;
let lastPressedT = false;
let lastTestMoveTime = Date.now();
const TEST_DIRECTIONS = ["up", "right", "down", "left"];

function handleKeyboardInput() {
  if (!player) return;

  // 处理调试键 - T键切换测试模式
  if (keysPressed["t"] && !lastPressedT) {
    TEST_MODE = !TEST_MODE;
    TEST_AUTO_MOVE = TEST_MODE;
    console.log("测试模式:", TEST_MODE ? "开启" : "关闭");
    lastPressedT = true;
  } else if (!keysPressed["t"]) {
    lastPressedT = false;
  }

  // 自动移动测试 - 在测试模式下，自动移动
  if (TEST_AUTO_MOVE && Date.now() - lastTestMoveTime > 1000) {
    const direction = TEST_DIRECTIONS[TEST_DIRECTION_INDEX];
    TEST_DIRECTION_INDEX = (TEST_DIRECTION_INDEX + 1) % TEST_DIRECTIONS.length;

    player.direction = direction;

    let dx = 0,
      dy = 0;
    switch (direction) {
      case "up":
        dy = -player.speed;
        break;
      case "down":
        dy = player.speed;
        break;
      case "left":
        dx = -player.speed;
        break;
      case "right":
        dx = player.speed;
        break;
    }

    const moved = player.move(dx, dy);
    console.log(`测试移动 ${direction}: ${moved ? "成功" : "失败"}`);

    lastTestMoveTime = Date.now();
    return; // 如果是测试模式，不处理键盘输入
  }

  // 正常处理键盘输入
  let hasMoved = false;

  // 确保我们使用输入映射处理所有可能的键
  const keyMap = {
    up: ["ArrowUp", "arrowup", "w", "W"],
    down: ["ArrowDown", "arrowdown", "s", "S"],
    left: ["ArrowLeft", "arrowleft", "a", "A"],
    right: ["ArrowRight", "arrowright", "d", "D"],
    shoot: [" ", "Space", "space"],
  };

  // 检查是否有任意一个对应的键被按下
  const isDirectionPressed = (direction: keyof typeof keyMap): boolean => {
    return keyMap[direction].some((key: string) => keysPressed[key]);
  };

  // 移动函数
  const tryMove = (
    direction: keyof typeof keyMap,
    dx: number,
    dy: number
  ): void => {
    if (isDirectionPressed(direction)) {
      if (player) {
        // 先设置方向
        player.direction = direction;
        // 然后尝试移动
        const moved = player.move(dx, dy);
        if (moved) {
          hasMoved = true;
        }
      }
    }
  };

  // 尝试各个方向的移动
  tryMove("up", 0, -player.speed);
  tryMove("down", 0, player.speed);
  tryMove("left", -player.speed, 0);
  tryMove("right", player.speed, 0);

  // 射击处理
  if (keyMap.shoot.some((key) => keysPressed[key]) && player) {
    player.shoot();
  }
}

function drawGame() {
  if (!ctx || !canvas) return;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制背景
  ctx.fillStyle = "#1c1c1e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制网格线
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * TILE_SIZE, 0);
    ctx.lineTo(i * TILE_SIZE, canvas.height);
    ctx.stroke();
  }

  for (let j = 0; j <= ROWS; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * TILE_SIZE);
    ctx.lineTo(canvas.width, j * TILE_SIZE);
    ctx.stroke();
  }

  // 绘制墙壁
  walls.forEach((wall) => wall.draw());

  // 绘制粒子效果
  PARTICLES.forEach((particle) => particle.draw());

  // 绘制子弹
  bullets.forEach((bullet) => bullet.draw());

  // 绘制玩家
  if (player) {
    player.draw();
  }

  // 绘制敌人
  enemies.forEach((enemy) => enemy.draw());

  // 游戏结束/胜利消息
  if (gameState === "gameOver") {
    drawGameMessage("游戏结束", "#ff3b30");
  } else if (gameState === "victory") {
    drawGameMessage("胜利!", "#34c759");
  }
}

function drawGameMessage(message: string, color: string) {
  if (!ctx || !canvas) return;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 48px -apple-system, BlinkMacSystemFont";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

// --- 游戏主循环 ---
function gameLoop(timestamp: number) {
  // 计算两帧之间的时间差
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  // FPS计算
  fpsCounter++;
  fpsTimer += deltaTime;
  if (fpsTimer >= 1000) {
    currentFps = Math.round((fpsCounter * 1000) / fpsTimer);
    fpsCounter = 0;
    fpsTimer = 0;
  }

  // 使用固定时间步长更新游戏
  updateGame();
  drawGame();

  // 请求下一帧
  animationFrameId = requestAnimationFrame(gameLoop);
}

function setupEventListeners() {
  // 清理之前的事件监听器
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);

  // 添加新的事件监听器
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
}

function handleKeyDown(e: KeyboardEvent) {
  // 统一转为小写并记录按键
  const key = e.key.toLowerCase();
  keysPressed[key] = true;

  // 同时保持原始按键记录（兼容性）
  keysPressed[e.key] = true;

  // 防止按键默认行为，包括WASD和箭头键
  if (
    key === " " ||
    key === "arrowup" ||
    key === "arrowdown" ||
    key === "arrowleft" ||
    key === "arrowright" ||
    key === "w" ||
    key === "a" ||
    key === "s" ||
    key === "d"
  ) {
    e.preventDefault();
  }
}

function handleKeyUp(e: KeyboardEvent) {
  // 统一处理小写和原始按键
  const key = e.key.toLowerCase();
  keysPressed[key] = false;
  keysPressed[e.key] = false;
}

export function startGameLoop() {
  if (animationFrameId === null) {
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

export function stopGameLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // 清理事件监听器
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
}

export function restartGame() {
  if (canvas) {
    initGame(canvas);
  }
}

export function pauseGame() {
  if (gameState === "playing") {
    gameState = "paused";
  } else if (gameState === "paused") {
    gameState = "playing";
  }
}
