// sketch.js — Dodge & Dash (p5.js)
// Jogo arcade: desvie dos inimigos, colete moedas e use o DASH!
// Coloque este arquivo como "sketch.js" e inclua p5.js no HTML.

// ==================== VARIÁVEIS GLOBAIS ====================
let player;
let enemies = [];
let coins = [];
let particles = [];

let gameState = "MENU"; // MENU, PLAYING, PAUSED, GAMEOVER
let score = 0;
let best = 0;
let coinCount = 0;

let lastSpawnEnemy = 0;
let enemySpawnDelay = 900; // ms (reduz com o tempo)
let lastSpawnCoin = 0;
let coinSpawnDelay = 1200; // ms

let lastDash = -9999;
let dashCooldown = 2800; // ms

let worldShake = 0;
let lastFrameTime = 0;

let inputVec = { x: 0, y: 0 }; // teclado + toque arraste
let usingTouchStick = false;

// ==================== UTIL LOCALSTORAGE ====================
function loadBest() {
  try {
    const b = localStorage.getItem("dnd-best");
    return b ? Number(b) : 0;
  } catch (e) {
    return 0;
  }
}
function saveBest(val) {
  try {
    localStorage.setItem("dnd-best", String(val));
  } catch (e) {}
}

// ==================== SETUP / DRAW ====================
function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(RADIANS);
  rectMode(CENTER);
  textFont("system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial");
  best = loadBest();
  resetGame();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function resetGame() {
  player = new Player(width * 0.5, height * 0.5);
  enemies.length = 0;
  coins.length = 0;
  particles.length = 0;

  score = 0;
  coinCount = 0;

  lastSpawnEnemy = millis();
  enemySpawnDelay = 900;

  lastSpawnCoin = millis();
  usingTouchStick = false;

  lastDash = -9999;
  worldShake = 0;

  inputVec.x = 0;
  inputVec.y = 0;

  lastFrameTime = millis();
  gameState = "MENU";
}

function draw() {
  const now = millis();
  const dt = constrain(now - lastFrameTime, 0, 50); // ms (limita para não explodir)
  lastFrameTime = now;

  background(11, 16, 32);

  // Grade sutil de fundo
  drawBackgroundGrid();

  push();
  applyWorldShake();

  switch (gameState) {
    case "MENU":
      drawScenePlaying(dt, false);
      drawTitle();
      break;
    case "PLAYING":
      updateInputFromKeyboard(); // teclado
      player.update(dt);
      spawnThings(now);
      updateEnemies(dt);
      updateCoins(dt);
      updateParticles(dt);
      checkCollisions();
      score += dt * 0.01; // pontua com o tempo
      drawScenePlaying(dt, true);
      break;
    case "PAUSED":
      drawScenePlaying(dt, false);
      drawPause();
      break;
    case "GAMEOVER":
      drawScenePlaying(dt, false);
      drawGameOver();
      break;
  }

  pop();

  drawHUD(now);
}

// ==================== CENAS E HUD ====================
function drawBackgroundGrid() {
  noFill();
  stroke(255, 255, 255, 10);
  const step = 48;
  for (let x = (frameCount % step); x < width; x += step) {
    line(x, 0, x, height);
  }
  for (let y = (frameCount % step); y < height; y += step) {
    line(0, y, width, y);
  }
}

function applyWorldShake() {
  // tremor de mundo
  if (worldShake > 0) {
    translate(random(-worldShake, worldShake), random(-worldShake, worldShake));
    worldShake = max(0, worldShake - 0.6);
  }
}

function drawScenePlaying(dt, liveUpdate) {
  // moedas
  for (const c of coins) c.draw();
  // inimigos
  for (const e of enemies) e.draw();
  // player
  player.draw();
  // partículas
  for (const p of particles) p.draw();
}

function drawTitle() {
  const title = "Dodge & Dash";
  const sub = "Desvie dos inimigos. Colete moedas. Use o DASH!";
  const help = "WASD/Setas movem • Espaço/Shift dá DASH • P pausa • Clique/Toque para começar";

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);

  push();
  textSize(56);
  shadowText(title, width * 0.5, height * 0.35);
  pop();

  textSize(18);
  fill(210);
  text(sub, width * 0.5, height * 0.44);

  textSize(14);
  fill(180);
  text(help, width * 0.5, height * 0.52);

  // dica recorde
  textSize(12);
  fill(160);
  text(`Recorde: ${best.toFixed(0)}  •  Moedas totais (sessão): ${coinCount}`, width * 0.5, height * 0.58);
}

function drawPause() {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(44);
  shadowText("Pausado", width * 0.5, height * 0.4);
  textSize(16);
  fill(200);
  text("Pressione P para continuar • R para reiniciar", width * 0.5, height * 0.48);
}

function drawGameOver() {
  noStroke();
  fill(255, 200, 200);
  textAlign(CENTER, CENTER);
  textSize(48);
  shadowText("Game Over", width * 0.5, height * 0.4);

  textSize(18);
  fill(230);
  text(`Score: ${score.toFixed(0)}   •   Recorde: ${best.toFixed(0)}   •   Moedas: ${coinCount}`, width * 0.5, height * 0.48);

  textSize(14);
  fill(200);
  text("Clique/Toque ou pressione R para jogar de novo", width * 0.5, height * 0.55);
}

function drawHUD(now) {
  // barra superior
  const pad = 12;
  const h = 36;
  fill(255, 255, 255, 18);
  noStroke();
  rectMode(CORNER);
  rect(pad, pad, width - pad * 2, h, 10);

  // textos
  fill(230);
  textAlign(LEFT, CENTER);
  textSize(16);
  const gap = 18;

  let x = pad + 12;
  text(`Score: ${score.toFixed(0)}`, x, pad + h * 0.5);
  x += textWidth(`Score: ${score.toFixed(0)}`) + gap;

  text(`Recorde: ${best.toFixed(0)}`, x, pad + h * 0.5);
  x += textWidth(`Recorde: ${best.toFixed(0)}`) + gap;

  text(`Moedas: ${coinCount}`, x, pad + h * 0.5);

  // barra de cooldown do dash (direita)
  const cdw = 160;
  const cdh = 12;
  const cdX = width - pad - cdw - 12;
  const cdY = pad + (h - cdh) * 0.5;

  fill(255, 255, 255, 40);
  rect(cdX, cdY, cdw, cdh, 8);

  const t = constrain((now - lastDash) / dashCooldown, 0, 1);
  fill(140, 220, 255, 170);
  rect(cdX, cdY, cdw * t, cdh, 8);

  fill(220);
  textAlign(RIGHT, CENTER);
  textSize(12);
  text(t >= 1 ? "DASH PRONTO (Space/Shift)" : "DASH carregando…", cdX - 6, cdY + cdh * 0.5);

  // dica de pause
  textAlign(RIGHT, CENTER);
  textSize(12);
  fill(180);
  text("P pausa • R reiniciar", width - pad, pad + h * 0.5);

  // stick virtual (apenas quando tocando)
  if (usingTouchStick) {
    drawTouchStick();
  }
}

function shadowText(str, x, y) {
  push();
  fill(0, 0, 0, 120);
  text(str, x + 2, y + 2);
  fill(255);
  text(str, x, y);
  pop();
}

// ==================== ENTIDADES ====================
class Player {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.dir = createVector(1, 0);
    this.speed = 3.4;
    this.r = 16;
    this.invFor = 0; // ms (iframes)
  }

  update(dt) {
    // entrada (teclado + toque)
    const iv = createVector(inputVec.x, inputVec.y);
    if (iv.mag() > 1) iv.normalize();
    if (iv.mag() > 0.001) {
      this.dir = iv.copy();
    }

    // aceleração/velocidade
    const acc = iv.mult(this.speed);
    this.vel.lerp(acc, 0.6);
    this.pos.add(p5.Vector.mult(this.vel, dt * 0.06));

    // limitar bordas
    this.pos.x = constrain(this.pos.x, this.r, width - this.r);
    this.pos.y = constrain(this.pos.y, this.r, height - this.r);

    // decair invencibilidade
    this.invFor = max(0, this.invFor - dt);
  }

  dash() {
    const now = millis();
    if (now - lastDash < dashCooldown) return false;

    lastDash = now;
    let d = this.dir.copy();
    if (d.mag() < 0.001) d = createVector(1, 0);

    // impulso
    this.pos.add(d.mult(140));
    // proteção breve
    this.invFor = 220;

    // feedback
    worldShake = 10;
    for (let i = 0; i < 22; i++) {
      particles.push(new Particle(this.pos.x, this.pos.y, 10));
    }
    return true;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.dir.heading());

    const blink = this.invFor > 0 && (floor(millis() / 60) % 2 === 0);

    noStroke();
    // rastro
    fill(120, 200, 255, 50);
    triangle(-18, -9, -18, 9, -38, 0);

    // corpo
    if (!blink) fill(180, 220, 255);
    else fill(255);
    triangle(18, 0, -12, -12, -12, 12);

    // olho
    fill(20, 30, 50, 220);
    ellipse(4, 0, 6, 6);

    pop();
  }
}

class Enemy {
  constructor(x, y, speed) {
    this.pos = createVector(x, y);
    this.speed = speed;
    this.r = random(12, 18);
    this.angle = random(TWO_PI);
    this.turnRate = random(0.02, 0.06);
    this.color = color(255, 90, 120, 210);
  }

  update(dt) {
    // perseguir player com leve curva
    const toPlayer = p5.Vector.sub(player.pos, this.pos);
    const desiredAngle = toPlayer.heading();
    let da = angleDiff(this.angle, desiredAngle);
    this.angle += constrain(da, -this.turnRate, this.turnRate);

    const dir = p5.Vector.fromAngle(this.angle);
    this.pos.add(p5.Vector.mult(dir, this.speed * dt * 0.06));

    // partículas ocasionais
    if (random() < 0.02) particles.push(new Particle(this.pos.x, this.pos.y, 5, this.color));
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    noStroke();
    fill(this.color);
    ellipse(0, 0, this.r * 2.0, this.r * 1.5);
    fill(40, 0, 10, 120);
    ellipse(this.r * 0.2, 0, this.r * 0.7, this.r * 0.7);
    pop();
  }
}

class Coin {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.r = 10;
    this.t = random(TWO_PI);
  }

  update(dt) {
    this.t += dt * 0.005;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(sin(this.t) * 0.3);
    noStroke();
    fill(255, 210, 80);
    ellipse(0, 0, this.r * 2, this.r * 2);
    fill(255, 240, 160);
    ellipse(0, 0, this.r * 1.3, this.r * 1.3);
    pop();
  }
}

class Particle {
  constructor(x, y, life = 12, col) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.5, 3));
    this.life = life + random(-4, 6);
    this.maxLife = this.life;
    this.col = col || color(140, 220, 255, 200);
    this.size = random(2, 5);
  }

  update(dt) {
    this.pos.add(p5.Vector.mult(this.vel, dt * 0.06));
    this.vel.mult(0.98);
    this.life -= dt * 0.06;
  }

  draw() {
    const a = map(this.life, 0, this.maxLife, 0, 255);
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), a);
    circle(this.pos.x, this.pos.y, this.size);
  }
}

// ==================== ATUALIZAÇÃO DE MUNDOS ====================
function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update(dt);
    // Fora de um mega-bounding? (não precisa pois caçam o player)
  }
}

function updateCoins(dt) {
  for (let i = coins.length - 1; i >= 0; i--) {
    coins[i].update(dt);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

function spawnThings(now) {
  // inimigos
  if (now - lastSpawnEnemy > enemySpawnDelay) {
    lastSpawnEnemy = now;
    spawnEnemyAtEdge();
    // acelera a frequência conforme o tempo
    enemySpawnDelay = max(350, enemySpawnDelay * 0.985);
  }

  // moedas
  if (now - lastSpawnCoin > coinSpawnDelay) {
    lastSpawnCoin = now;
    spawnCoin();
    coinSpawnDelay = random(900, 1400);
  }
}

function spawnEnemyAtEdge() {
  // nascer nas bordas
  const side = floor(random(4));
  let x, y;
  if (side === 0) {
    x = -20;
    y = random(height);
  } else if (side === 1) {
    x = width + 20;
    y = random(height);
  } else if (side === 2) {
    x = random(width);
    y = -20;
  } else {
    x = random(width);
    y = height + 20;
  }

  // dificuldade escala com score
  const base = 1.8;
  const bonus = min(4.0, 0.15 * sqrt(score + 1));
  const spd = base + random(0.2, 0.7) + bonus;

  enemies.push(new Enemy(x, y, spd));
}

function spawnCoin() {
  let tries = 40;
  while (tries-- > 0) {
    const x = random(30, width - 30);
    const y = random(30, height - 30);
    if (p5.Vector.dist(createVector(x, y), player.pos) > 120) {
      coins.push(new Coin(x, y));
      return;
    }
  }
  // fallback
  coins.push(new Coin(width * 0.2 + random(width * 0.6), height * 0.2 + random(height * 0.6)));
}

// ==================== COLISÕES ====================
function checkCollisions() {
  // player x moeda
  for (let i = coins.length - 1; i >= 0; i--) {
    if (circleHit(player.pos.x, player.pos.y, player.r, coins[i].pos.x, coins[i].pos.y, coins[i].r)) {
      coinCount++;
      score += 15;
      worldShake = 6;
      for (let p = 0; p < 14; p++) particles.push(new Particle(coins[i].pos.x, coins[i].pos.y, 12, color(255, 220, 120)));
      coins.splice(i, 1);
    }
  }

  // player x inimigo
  if (player.invFor <= 0) {
    for (let i = 0; i < enemies.length; i++) {
      if (circleHit(player.pos.x, player.pos.y, player.r, enemies[i].pos.x, enemies[i].pos.y, enemies[i].r)) {
        // morreu
        best = max(best, floor(score));
        saveBest(best);
        worldShake = 14;
        for (let p = 0; p < 30; p++) particles.push(new Particle(player.pos.x, player.pos.y, 16, color(255, 120, 140)));
        gameState = "GAMEOVER";
        return;
      }
    }
  }
}

// ==================== ENTRADA (TECLADO/TOQUE) ====================
function updateInputFromKeyboard() {
  let x = 0, y = 0;
  if (keyIsDown(65) || keyIsDown(37)) x -= 1; // A/←
  if (keyIsDown(68) || keyIsDown(39)) x += 1; // D/→
  if (keyIsDown(87) || keyIsDown(38)) y -= 1; // W/↑
  if (keyIsDown(83) || keyIsDown(40)) y += 1; // S/↓
  // Se estiver usando o stick de toque, ele já ajusta inputVec direto nos handlers
  if (!usingTouchStick) {
    inputVec.x = x;
    inputVec.y = y;
  }
}

function keyPressed() {
  if (key === " " || keyCode === SHIFT) {
    if (gameState === "PLAYING") player.dash();
  }
  if (key === "p" || key === "P") {
    if (gameState === "PLAYING") gameState = "PAUSED";
    else if (gameState === "PAUSED") gameState = "PLAYING";
  }
  if (key === "r" || key === "R") {
    resetGame();
    gameState = "PLAYING";
  }
}

function mousePressed() {
  if (gameState === "MENU") {
    gameState = "PLAYING";
  } else if (gameState === "GAMEOVER") {
    resetGame();
    gameState = "PLAYING";
  }
  // Toque/click dá dash se for botão direito/segundo toque rápido?
}

function doubleClicked() {
  // Duplo clique = dash (conveniência em mobile/trackpad)
  if (gameState === "PLAYING") player.dash();
}

// Suporte a toque: arraste para direcionar o movimento (stick virtual simples)
let touchStartPos = null;
function touchStarted() {
  if (gameState === "MENU") gameState = "PLAYING";
  if (gameState === "GAMEOVER") {
    resetGame();
    gameState = "PLAYING";
  }
  usingTouchStick = true;
  touchStartPos = createVector(mouseX, mouseY);
  inputVec.x = 0; inputVec.y = 0;
  return false;
}
function touchMoved() {
  if (!touchStartPos) return false;
  const cur = createVector(mouseX, mouseY);
  const delta = p5.Vector.sub(cur, touchStartPos);
  const dead = 8;
  if (delta.mag() < dead) {
    inputVec.x = 0; inputVec.y = 0;
  } else {
    delta.limit(80);
    const v = delta.copy().div(80); // normaliza
    inputVec.x = v.x;
    inputVec.y = v.y;
  }
  return false;
}
function touchEnded() {
  usingTouchStick = false;
  inputVec.x = 0; inputVec.y = 0;
  touchStartPos = null;
  return false;
}

function drawTouchStick() {
  if (!touchStartPos) return;
  const base = touchStartPos;
  const cur = createVector(mouseX, mouseY);
  const delta = p5.Vector.sub(cur, base);
  delta.limit(80);

  noFill();
  stroke(255, 255, 255, 60);
  strokeWeight(2);
  circle(base.x, base.y, 120);

  noStroke();
  fill(255, 255, 255, 90);
  circle(base.x + delta.x, base.y + delta.y, 40);
}

// ==================== HELPERS ====================
function angleDiff(a, b) {
  let d = (b - a + PI) % (TWO_PI);
  if (d < 0) d += TWO_PI;
  return d - PI;
}

function circleHit(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const rr = r1 + r2;
  return dx * dx + dy * dy <= rr * rr;
}
