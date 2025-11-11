// 🎮 우주 슈팅 게임 
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ▶ 전투기 이미지 로드
const playerImage = new Image();
playerImage.src = "images/fighter.png"; // 플레이어 전투기 이미지

// ▶ 보스 이미지 로드
const first_bossImage = new Image();
first_bossImage.src = "images/boss1.png";
const second_bossImage = new Image();
second_bossImage.src = "images/boss2/png";
const third_bossImage = new Image();
third_bossImage.src = "images/boss3.png";

// ▶ 외계인 적 이미지 로드  
const alienImage = new Image();
alienImage.src = "images/ufo.png"; // 외계인 적 이미지 경로 

// ▶ 플레이어 설정 
const player = {
  x: 180,
  y: 550,
  width: 40,
  height: 40,
  speed: 200,
  life: 3
};

let bestScore = Number(localStorage.getItem("bestScore")) || 0;  // 최고 점수 저장
const restartButton = document.getElementById("restartButton");
const startButton   = document.getElementById("startButton");

let gameStarted = false;   // ⭐ 게임이 실제로 시작됐는지 여부

// 공통 게임 상태 초기화 함수
function resetGameState() {
  score = 0;
  player.life = 3;
  player.x = 180;
  player.y = 550;
  bullets = [];
  enemies = [];
  enemyBullets = [];
  items = [];
  effects = [];
  boss = null;
  bossActive = false;
  currentBossIndex = 0;
  timer = 0;
  lastTime = 0;
}

// 게임 시작 (처음 시작할 때 한 번 호출)
function startGame() {
  if (gameStarted) return;       // 두 번 시작 방지

  gameStarted = true;
  gameOver = false;

  resetGameState();

  startButton.style.display = "none";     // 시작 버튼 숨기기
  restartButton.style.display = "none";   // 혹시 모르니 같이 숨기기
}

// 게임 끝났을 때 처리 (점수 기록 + 버튼 보이기)
function endGame() {
  gameOver = true;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", bestScore);
  }

  restartButton.style.display = "block";
}

// 게임 다시 시작
function restartGame() {
  resetGameState();
  gameOver = false;
  gameStarted = true;

  restartButton.style.display = "none";
}

// 버튼 클릭하면 재시작
restartButton.addEventListener("click", restartGame);
// 시작 버튼 클릭하면 게임 시작
startButton.addEventListener("click", startGame);

// 💗 보스 HP 게이지바 그리기 (여러 보스 공용)
function drawBossHpBar() {
  if (!bossActive || !boss) return;

  const barWidth  = 220;
  const barHeight = 18;
  const x = canvas.width / 2 - barWidth / 2;
  const y = 40;

  const hpRatio = Math.max(boss.life, 0) / boss.maxLife;

  // 배경 박스
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

  // 전체 HP (빨간색)
  ctx.fillStyle = "red";
  ctx.fillRect(x, y, barWidth, barHeight);

  // 남은 HP (초록색)
  ctx.fillStyle = "lime";
  ctx.fillRect(x, y, barWidth * hpRatio, barHeight);

  // 테두리
  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, barWidth, barHeight);

  // 텍스트 (보스 이름 + 체력)
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    `${boss.name || "BOSS"} HP: ${boss.life}/${boss.maxLife}`,
    canvas.width / 2,
    y + barHeight - 4
  );
}

// ▶ 보스 설정
const bosses = [
  {
    name: "Boss 1",
    width: 100,
    height: 90,
    speed: 100,
    maxLife: 30,
    scoreToSpawn: 10,      // 점수가 10 이상이면 등장
    score: 30,
    image: first_bossImage
  },
  {
    name: "Boss 2",
    width: 140,
    height: 110,
    speed: 80,
    maxLife: 50,
    scoreToSpawn: 50,
    score: 50,
    image: second_bossImage
  },
  {
    name: "Boss 3",
    width: 160,
    height: 130,
    speed: 120,
    maxLife: 10,
    scoreToSpawn: 120,
    score: 100,
    image: third_bossImage
  }
];

// ▶ 상태 변수
let lastTime = 0;
let bullets = [];
let enemies = [];
let enemyBullets = [];  // 1️⃣ 적 총알
let items = [];    // 3️⃣ 아이템
let effects = [];  // 2️⃣ 폭발 이펙트
let score = 0;
let gameOver = false;
let keys = {};
let canShoot = true;          // 지금 발사 가능한지 여부
const shootDelay = 200;       // 발사 딜레이(ms) 200ms = 0.2초
let boss = null;               // 현재 활성화된 보스 정보
let bossActive = false;        // 보스가 필드에 있는지
let bossTargetX = 0;           // 보스가 움직일 목표 위치
let bossTargetY = 0;
let currentBossIndex = 0;
let timer = 0;

// ▶ 별 배경 (움직이는 우주 느낌)
const stars = Array.from({ length: 50 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 1 + 200
}));

// ▶ 키 입력 처리
// ▶ 키 입력 처리 
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  // 아직 시작 안 했을 때 : Enter / Space로 시작
  if (!gameStarted && (e.key === "Enter" || e.key === " ")) {
    startGame();
  }

  // 게임 오버 상태에서 : Enter / Space로 재시작
  if (gameOver && (e.key === "Enter" || e.key === " ")) {
    restartGame();
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// ▶ 플레이어 총알 발사
function shoot() {
  if(!canShoot) return;

  bullets.push({
    x: player.x + player.width / 2 - 2,
    y: player.y,
    width: 4,
    height: 10,
    speed: 500
  });

  canShoot = false;
  setTimeout(() => canShoot = true, shootDelay);
}

// ▶ 적 생성
function spawnEnemy() {
  if (!gameStarted) return;
  if (bossActive) return;
  if (gameOver) return;

  const x = Math.random() * (canvas.width - 40); // 너비 고려
  enemies.push({ x: x, y: 0, width: 40, height: 40, speed: 300 });
}

// ▶ 적 총알 발사
function enemyShoot() {
  if (bossActive) return; // 보스가 있을 땐 일반 적의 총알 발사 X
  if (!gameStarted) return;
  if (gameOver) return;
  if (enemies.length === 0) return;

  const shooter = enemies[Math.floor(Math.random() * enemies.length)];
  enemyBullets.push({
    x: shooter.x + shooter.width / 2 - 2,
    y: shooter.y + shooter.height,
    width: 4,
    height: 10,
    speed: 500
  });
}

// ▶ 보스가 이동할 랜덤 목표 위치 설정 (상단 2/5 영역)
function setBossNewTarget() {
  if (!boss) return;
  const maxY = (canvas.height * 2 / 5) - boss.height;
  const minY = 0;

  bossTargetX = Math.random() * (canvas.width - boss.width);
  bossTargetY = Math.random() * Math.max(maxY, minY);
}

function spawnBoss() {
  // 더 이상 나올 보스가 없으면 그냥 리턴
  if (currentBossIndex >= bosses.length) return;

  const data = bosses[currentBossIndex];

  boss = {
    x: canvas.width / 2 - data.width / 2,
    y: 50,
    width: data.width,
    height: data.height,
    speed: data.speed,
    life: data.maxLife,      // 현재 체력
    maxLife: data.maxLife,   // 최대 체력 (게이지용)
    image: data.image,
    name: data.name,
    score: data.score
  };

  bossActive = true;

  // 보스 등장할 때 기존 적/총알 정리
  enemies = [];
  enemyBullets = [];

  setBossNewTarget();
}

// ▶ 충돌 판정
function isColliding(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// ▶ 폭발 이펙트 생성
function spawnEffect(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    effects.push({
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      life: 30,
      color: `hsl(${Math.random() * 360}, 100%, 60%)`
    });
  }
}

// ▶ 아이템 생성
function spawnItem(x, y) {
  items.push({
    x,
    y,
    width: 12,
    height: 12,
    speed: 200
  });
}

// ▶ 별 배경 업데이트
function updateStars(delta) {
  for (let s of stars) {
    s.y += s.speed * delta;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  }
}

// ▶ 이펙트 업데이트
function updateEffects() {
  effects.forEach(e => {
    e.x += e.dx;
    e.y += e.dy;
    e.life--;
  });
  effects = effects.filter(e => e.life > 0);
}

// ▶ 아이템 업데이트
function updateItems(delta) {
  items.forEach(item => {
    item.y += item.speed * delta;
    if (isColliding(item, player)) {
      score += 10;
      item.collected = true;
    }
  });
  items = items.filter(i => i.y < canvas.height && !i.collected);
}

function updateBoss(delta) {
  if (!bossActive || !boss) return;

  // 💫 목표 지점을 향해 이동
  const dx = bossTargetX - boss.x;
  const dy = bossTargetY - boss.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 5) {
    // 목표에 거의 도달하면 새 목표 설정
    setBossNewTarget();
  } else {
    const move = boss.speed * delta;
    if (move >= dist) {
      boss.x = bossTargetX;
      boss.y = bossTargetY;
    } else {
      boss.x += (dx / dist) * move;
      boss.y += (dy / dist) * move;
    }
  }

  // 💥 플레이어 총알과의 충돌 처리
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (bossActive && isColliding(boss, b)) {
      bullets.splice(i, 1); // 맞은 총알 제거
      boss.life--;
      spawnEffect(boss.x + boss.width / 2, boss.y + boss.height / 2);

      if (boss.life <= 0) {
        // 보상 점수
        score += boss.score;

        // 보스 격파!
        bossActive = false;
        boss = null;

        // 다음 보스로 인덱스 증가
        currentBossIndex++;

        return;
      }
    }
  }

  // ⚠️ 보스와 플레이어의 충돌
  if (bossActive && isColliding(boss, player)) {
    player.life--;
    if (player.life <= 0) endGame();
  }
}

// ▶ 배경 별 그리기
function drawStars() {
  ctx.fillStyle = "#6f879eff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  for (let s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ▶ 이펙트 그리기
function drawEffects() {
  for (let e of effects) {
    const alpha = e.life / 30;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ⭐ 별 모양 아이템 그리기 함수
function drawStarShape(x, y, radius, points, inset) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(x, y);
  ctx.moveTo(0, 0 - radius);
  for (let i = 0; i < points; i++) {
    ctx.rotate(Math.PI / points);
    ctx.lineTo(0, 0 - (radius * inset));
    ctx.rotate(Math.PI / points);
    ctx.lineTo(0, 0 - radius);
  }
  ctx.closePath();
  ctx.restore();
}

// ⭐ 아이템 그리기
function drawItems() {
  ctx.fillStyle = "orange";
  for (let item of items) {
    ctx.beginPath();
    drawStarShape(item.x + item.width / 2, item.y + item.height / 2, 6, 5, 0.5);
    ctx.fill();
  }
}

function drawStartScreen() {
  // 반투명 배경
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  ctx.font = "32px Arial";
  ctx.fillText("Galaxy Defender", canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = "18px Arial";
  ctx.fillText("방향키 / WASD : 이동", canvas.width / 2, canvas.height / 2);
  ctx.fillText("스페이스바 : 공격", canvas.width / 2, canvas.height / 2 + 30);

  ctx.font = "14px Arial";
  ctx.fillText("게임 시작 버튼 또는 Enter / Space", canvas.width / 2, canvas.height / 2 + 70);

  ctx.fillText(`Best Score: ${bestScore}`, canvas.width / 2, canvas.height / 2 + 100);
}

function drawGameOverScreen() {
  // 반투명 배경
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  ctx.font = "36px Arial";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
  ctx.fillText(`Best: ${bestScore}`, canvas.width / 2, canvas.height / 2 + 30);

  ctx.font = "14px Arial";
  ctx.fillText("다시 시작 버튼을 누르세요", canvas.width / 2, canvas.height / 2 + 60);
}

// ▶ 메인 게임 루프
function update(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  updateBoss(delta);

  if (gameStarted && !gameOver) {
    timer += delta;

    updateStars(delta);
    updateEffects();
    updateItems(delta);    // 3️⃣ 아이템

    // 플레이어 이동
    if ((keys["ArrowUp"] || keys["w"]) && player.y > 0) player.y -= player.speed * delta;
    if ((keys["ArrowDown"] || keys["s"]) && player.y + player.height < canvas.height) player.y += player.speed * delta;
    if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) player.x -= player.speed * delta;
    if ((keys["ArrowRight"] || keys["d"]) && player.x + player.width < canvas.width) player.x += player.speed * delta;
    if (keys[" "]) shoot();

    // 총알 이동
    bullets.forEach(b => b.y -= b.speed * delta);
    bullets = bullets.filter(b => b.y > 0);

    // 적 이동 및 충돌 처리
    enemies = enemies.filter(e => {
      e.y += e.speed * delta;
      if (isColliding(e, player)) {
        player.life--;
        if (player.life <= 0) endGame();
        return false;
      }

      for (let b of bullets) {
        if (isColliding(e, b)) {
          score++;
          bullets = bullets.filter(bullet => bullet !== b);
          spawnEffect(e.x + e.width / 2, e.y + e.height / 2);

          if (Math.random() < 0.3) {  // 3️⃣ 아이템
            spawnItem(e.x + e.width / 2 - 6, e.y);
          }

          return false;
        }
      }
      return e.y < canvas.height;
    });

    // 적 총알 이동 및 충돌
    enemyBullets = enemyBullets.filter(bullet => {
      bullet.y += bullet.speed * delta;

      if (isColliding(bullet, player)) {
        player.life--;
        if (player.life <= 0) endGame();
        return false;            // 플레이어에 맞은 총알은 제거
      }

      return bullet.y < canvas.height; // 화면 밖으로 나간 총알도 제거
    });

    // 점수에 따라 해당 순서의 보스 소환
    if (!bossActive && currentBossIndex < bosses.length && score >= bosses[currentBossIndex].scoreToSpawn) {
      spawnBoss();
    }
  }

  // ▶ 그리기
  drawStars();       // 배경
  drawEffects();     // 2️⃣ 이펙트 폭발 효과
  drawItems();       // 3️⃣ 아이템

  // 🧨 보스
  if (bossActive && boss) {
    // 현재 보스의 이미지로 그리기
    ctx.drawImage(boss.image || first_bossImage, boss.x, boss.y, boss.width, boss.height);

    // 💗 보스 체력바 그리기
    drawBossHpBar();
  }

  // ▶ 적  
  enemies.forEach(e => {
    ctx.drawImage(alienImage, e.x, e.y, e.width, e.height);
  });

  // ▶ 플레이어 총알
  bullets.forEach(b => {
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });

  // ▶ 적 총알
  enemyBullets.forEach(b => {
    ctx.fillStyle = "black";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });

  // ▶ 플레이어
  ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);

  // ▶ 점수 & 타이머 표시
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";

  // 점수는 왼쪽 정렬
  ctx.textAlign = 'left';
  ctx.fillText("Score: " + score + " Life: " + player.life, 20, 25);

  // ⏱ 타이머 (MM:SS 형식)
  const totalSeconds = Math.floor(timer);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  ctx.textAlign = 'right';
  ctx.fillText(`Time: ${minutes}:${seconds}`, canvas.width - 10, 25);

  if (!gameStarted) drawStartScreen();
  else if (gameOver) drawGameOverScreen();

  requestAnimationFrame(update);
}

// ▶ 적 생성 및 총알 발사 주기 설정
setInterval(spawnEnemy, 1000);
setInterval(enemyShoot, 1500); 

// ▶ 게임 시작
requestAnimationFrame(update);