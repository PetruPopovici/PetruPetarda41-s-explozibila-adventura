const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthEl = document.getElementById('health');
const explosionsEl = document.getElementById('explosions');
const enemiesEl = document.getElementById('enemies');
const objectiveEl = document.getElementById('objective');
const messages = document.getElementById('messages');

const tileSize = 32;
const cols = 20;
const rows = 15;
let gameOver = false;
let messageIndex = 0;

const map = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1],
  [1,0,0,0,2,0,0,0,0,0,0,0,0,0,0,2,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,0,0,1,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0,0,0,1],
  [1,0,0,0,2,0,1,0,1,0,0,1,0,1,0,2,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,0,0,1,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const player = {
  x: 2,
  y: 2,
  health: 100,
  explosions: 0,
  color: '#ffdd55',
  radius: 12,
};

const enemies = [
  {x: 7, y: 3, health: 40, alive: true},
  {x: 15, y: 4, health: 40, alive: true},
  {x: 8, y: 8, health: 40, alive: true},
  {x: 13, y: 11, health: 40, alive: true},
];

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false,
  ' ': false,
  Enter: false,
};

let lastAttackTime = 0;
const attackCooldown = 500;

function drawMap() {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tile = map[row][col];
      switch (tile) {
        case 0:
          ctx.fillStyle = '#80c040';
          break;
        case 1:
          ctx.fillStyle = '#3d5b1f';
          break;
        case 2:
          ctx.fillStyle = '#837153';
          break;
        case 3:
          ctx.fillStyle = '#ffd22a';
          break;
        default:
          ctx.fillStyle = '#80c040';
      }
      ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
      if (tile === 3) {
        ctx.fillStyle = '#9b643c';
        ctx.fillRect(col * tileSize + 6, row * tileSize + 10, 20, 12);
        ctx.fillStyle = '#d47f1a';
        ctx.fillRect(col * tileSize + 10, row * tileSize + 4, 12, 24);
      }
    }
  }
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x * tileSize + tileSize / 2, player.y * tileSize + tileSize / 2, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = '12px Arial';
  ctx.fillText('PP', player.x * tileSize + 10, player.y * tileSize + 20);
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const px = enemy.x * tileSize + tileSize / 2;
    const py = enemy.y * tileSize + tileSize / 2;
    ctx.fillStyle = '#cc2211';
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(px - 8, py - 4, 5, 5);
    ctx.fillRect(px + 3, py - 4, 5, 5);
    ctx.fillStyle = '#000';
    ctx.fillText('!', px - 4, py + 14);
  });
}

function updateStats() {
  healthEl.textContent = player.health;
  explosionsEl.textContent = player.explosions;
  enemiesEl.textContent = enemies.filter((enemy) => enemy.alive).length;
  objectiveEl.textContent = enemies.filter((enemy) => enemy.alive).length === 0 ? 'Reach Fort Knox to save Big Yahu' : 'Defeat all enemies first';
}

function addLog(text) {
  messageIndex += 1;
  const entry = document.createElement('p');
  entry.textContent = `${messageIndex}. ${text}`;
  messages.prepend(entry);
  if (messages.childElementCount > 12) {
    messages.removeChild(messages.lastChild);
  }
}

function canMoveTo(x, y) {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
  const tile = map[y][x];
  return tile !== 1 && tile !== 2;
}

function movePlayer(dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (!canMoveTo(nx, ny)) return;
  player.x = nx;
  player.y = ny;
  if (map[ny][nx] === 3 && enemies.filter((enemy) => enemy.alive).length === 0) {
    winGame();
  }
}

function attack() {
  const now = Date.now();
  if (now - lastAttackTime < attackCooldown || gameOver) return;
  lastAttackTime = now;
  player.explosions += 1;
  addLog('Petru Petarda explodes and damages nearby enemies!');
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const distance = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);
    if (distance <= 2) {
      enemy.health -= 30;
      if (enemy.health <= 0) {
        enemy.alive = false;
        addLog('An enemy was blown away!');
      } else {
        addLog('An enemy took damage from the blast.');
      }
    }
  });
  updateStats();
}

function enemyTurn() {
  if (gameOver) return;
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const moveX = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0;
    const moveY = moveX === 0 ? Math.sign(dy) : 0;
    const targetX = enemy.x + moveX;
    const targetY = enemy.y + moveY;
    if (canMoveTo(targetX, targetY) && !isEnemyAt(targetX, targetY) && !(targetX === player.x && targetY === player.y)) {
      enemy.x = targetX;
      enemy.y = targetY;
    }
    if (enemy.x === player.x && enemy.y === player.y) {
      player.health -= 10;
      addLog('An enemy hits Petru Petarda! Health drops.');
      if (player.health <= 0) {
        loseGame();
      }
    }
  });
}

function isEnemyAt(x, y) {
  return enemies.some((enemy) => enemy.alive && enemy.x === x && enemy.y === y);
}

function checkWinConditions() {
  if (gameOver) return;
  if (player.health <= 0) {
    loseGame();
    return;
  }
  if (map[player.y][player.x] === 3 && enemies.filter((enemy) => enemy.alive).length === 0) {
    winGame();
  }
}

function winGame() {
  gameOver = true;
  addLog('Petru Petarda storms Fort Knox and saves Big Yahu! Victory!');
  objectiveEl.textContent = 'Big Yahu is safe!';
}

function loseGame() {
  gameOver = true;
  addLog('Petru Petarda is defeated. The forest grows quiet...');
  objectiveEl.textContent = 'Mission failed';
}

function gameLoop() {
  if (gameOver) {
    draw();
    return;
  }

  if (keys.w || keys.ArrowUp) movePlayer(0, -1);
  if (keys.s || keys.ArrowDown) movePlayer(0, 1);
  if (keys.a || keys.ArrowLeft) movePlayer(-1, 0);
  if (keys.d || keys.ArrowRight) movePlayer(1, 0);
  if (keys[' '] || keys.Enter) attack();

  enemyTurn();
  checkWinConditions();
  updateStats();
  draw();

  Object.keys(keys).forEach((key) => { if (keys[key]) keys[key] = false; });
  setTimeout(() => requestAnimationFrame(gameLoop), 120);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawPlayer();
  drawEnemies();
  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '36px Comic Sans MS, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameOver && player.health > 0 ? 'YOU WON!' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '20px Comic Sans MS, Arial';
    ctx.fillText('Refresh the page to play again', canvas.width / 2, canvas.height / 2 + 20);
  }
}

window.addEventListener('keydown', (event) => {
  const key = event.key;
  if (key in keys) {
    keys[key] = true;
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key;
  if (key in keys) {
    keys[key] = false;
    event.preventDefault();
  }
});

function startGame() {
  addLog('Petru Petarda enters the forest, ready to explode his way through enemies.');
  addLog('Use WASD or arrow keys to move, and Space / Enter to attack.');
  updateStats();
  gameLoop();
}

startGame();
