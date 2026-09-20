(() => {
  'use strict';

  const W = 430;
  const H = 520;
  const DANGER_Y = 86;
  const STORAGE_KEY = 'cho-family-merge-scores-v1';
  const LAST_PLAYER_KEY = 'cho-family-merge-last-player';
  const LAST_DIFFICULTY_KEY = 'cho-family-merge-last-difficulty';
  const DIFFICULTIES = {
    easy: { label: '쉬움', spawnWeights: [.28, .35, .25, .12], sizeScale: .92, grace: 3, showGuide: true, previewCount: 2, scoreMultiplier: .8 },
    normal: { label: '보통', spawnWeights: [.48, .32, .16, .04], sizeScale: 1, grace: 1.7, showGuide: true, previewCount: 1, scoreMultiplier: 1 },
    challenge: { label: '도전', spawnWeights: [.74, .22, .04], sizeScale: 1.06, grace: 1, showGuide: false, previewCount: 0, scoreMultiplier: 1.5 }
  };
  const TYPES = [
    { name: '막내', radius: 25, color: '#76d94d', image: 'family', crop: [627, 627, 627, 627], points: 2, css: 'son' },
    { name: '둘째', radius: 34, color: '#ff69aa', image: 'family', crop: [0, 627, 627, 627], points: 6, css: 'second' },
    { name: '첫째', radius: 45, color: '#48a9ff', image: 'family', crop: [627, 0, 627, 627], points: 16, css: 'first' },
    { name: '엄마', radius: 57, color: '#ffbf32', image: 'family', crop: [0, 0, 627, 627], points: 40, css: 'wife' },
    { name: '아빠', radius: 70, color: '#168cff', image: 'dad', crop: [0, 0, 1254, 1254], points: 100, css: 'dad' },
    { name: '할머니', radius: 86, color: '#b255e7', image: 'grandparents', crop: [627, 215, 627, 627], points: 240, css: 'grandma' },
    { name: '할아버지', radius: 104, color: '#f2a21a', image: 'grandparents', crop: [0, 215, 627, 627], points: 600, css: 'grandpa' },
    { name: '엔더 드래곤', radius: 118, color: '#9f55ff', image: 'enderDragon', crop: [0, 0, 1254, 1254], points: 1400, css: 'ender-dragon' },
    { name: '커비', radius: 134, color: '#ff72b4', image: 'kirby', crop: [0, 0, 1254, 1254], points: 3200, css: 'kirby' },
    { name: '메타그로스', radius: 152, color: '#5f8fca', image: 'metagross', crop: [0, 0, 475, 475], points: 7000, css: 'metagross' }
  ];

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const imageBank = {
    family: new Image(),
    dad: new Image(),
    grandparents: new Image(),
    enderDragon: new Image(),
    kirby: new Image(),
    metagross: new Image()
  };
  imageBank.family.src = './assets/family-characters.png';
  imageBank.dad.src = './assets/dad-character.png';
  imageBank.grandparents.src = './assets/grandparents-characters.png';
  imageBank.enderDragon.src = './assets/ender-dragon.png';
  imageBank.kirby.src = './assets/kirby.png';
  imageBank.metagross.src = './assets/metagross.png';

  const els = {
    player: document.getElementById('playerDisplay'),
    score: document.getElementById('scoreDisplay'),
    best: document.getElementById('bestDisplay'),
    time: document.getElementById('timeDisplay'),
    difficulty: document.getElementById('difficultyDisplay'),
    leaderboard: document.getElementById('leaderboard'),
    leaderboardTitle: document.getElementById('leaderboardTitle'),
    next: document.getElementById('nextAvatar'),
    next2: document.getElementById('nextAvatar2'),
    nextCard: document.getElementById('nextCard'),
    nextHelp: document.getElementById('nextHelp'),
    nextMystery: document.getElementById('nextMystery'),
    startModal: document.getElementById('startModal'),
    gameOverModal: document.getElementById('gameOverModal'),
    playerInput: document.getElementById('playerNameInput'),
    startButton: document.getElementById('startButton'),
    newGameButton: document.getElementById('newGameButton'),
    retryButton: document.getElementById('retryButton'),
    changePlayerButton: document.getElementById('changePlayerButton'),
    clearScoresButton: document.getElementById('clearScoresButton'),
    soundButton: document.getElementById('soundButton'),
    finalPlayer: document.getElementById('finalPlayer'),
    finalScore: document.getElementById('finalScore'),
    finalTime: document.getElementById('finalTime'),
    resultDifficulty: document.getElementById('resultDifficulty'),
    resultIcon: document.getElementById('resultIcon'),
    resultEyebrow: document.getElementById('resultEyebrow'),
    resultTitle: document.getElementById('gameOverTitle'),
    recordMessage: document.getElementById('recordMessage'),
    gameMessage: document.getElementById('gameMessage')
  };

  let pieces = [];
  let particles = [];
  let playerName = '';
  let score = 0;
  let nextType = 0;
  let nextQueue = [0, 0];
  let difficultyKey = 'normal';
  let dropX = W / 2;
  let canDrop = false;
  let running = false;
  let gameOver = false;
  let finishing = false;
  let dangerTime = 0;
  let gameStartedAt = 0;
  let elapsedMs = 0;
  let lastTime = performance.now();
  let messageTimer = 0;
  let soundOn = true;
  let audioContext = null;

  function currentDifficulty() {
    return DIFFICULTIES[difficultyKey];
  }

  function scoreDifficulty(item) {
    return DIFFICULTIES[item?.difficulty] ? item.difficulty : 'normal';
  }

  function radiusFor(type) {
    return TYPES[type].radius * currentDifficulty().sizeScale;
  }

  function setDifficulty(key, persist = true) {
    difficultyKey = DIFFICULTIES[key] ? key : 'normal';
    const difficulty = currentDifficulty();
    if (persist) localStorage.setItem(LAST_DIFFICULTY_KEY, difficultyKey);
    document.querySelectorAll('input[name="difficulty"]').forEach(input => {
      input.checked = input.value === difficultyKey;
    });
    els.difficulty.textContent = difficulty.label;
    els.difficulty.className = `difficulty-badge ${difficultyKey}`;
    renderLeaderboard();
    updateNextAvatar();
  }

  function loadScores() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.filter(x => x && typeof x.name === 'string' && Number.isFinite(x.score)) : [];
    } catch {
      return [];
    }
  }

  function formatTime(ms) {
    const safe = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const tenths = Math.floor((safe % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  function saveScore(name, value, duration, cleared) {
    if (!name || value <= 0) return { scoreRecord: false, timeRecord: false };
    const scores = loadScores();
    const oldBest = scores.filter(x => x.name === name && scoreDifficulty(x) === difficultyKey).reduce((m, x) => Math.max(m, x.score), 0);
    const oldFastest = scores
      .filter(x => x.name === name && scoreDifficulty(x) === difficultyKey && x.cleared && Number.isFinite(x.elapsedMs))
      .reduce((m, x) => Math.min(m, x.elapsedMs), Infinity);
    scores.push({ name, score: value, elapsedMs: Math.floor(duration), cleared: !!cleared, difficulty: difficultyKey, date: Date.now() });
    scores.sort((a, b) => Number(b.cleared) - Number(a.cleared) || (a.cleared && b.cleared ? a.elapsedMs - b.elapsedMs : b.score - a.score) || a.date - b.date);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, 50)));
    renderLeaderboard();
    return { scoreRecord: value > oldBest, timeRecord: !!cleared && duration < oldFastest };
  }

  function personalBest(name) {
    return loadScores().filter(x => x.name === name && scoreDifficulty(x) === difficultyKey).reduce((m, x) => Math.max(m, x.score), 0);
  }

  function personalFastestClear(name) {
    return loadScores()
      .filter(x => x.name === name && scoreDifficulty(x) === difficultyKey && x.cleared && Number.isFinite(x.elapsedMs))
      .reduce((m, x) => Math.min(m, x.elapsedMs), Infinity);
  }

  function renderLeaderboard() {
    const bestByName = new Map();
    for (const item of loadScores()) {
      if (scoreDifficulty(item) !== difficultyKey) continue;
      const current = bestByName.get(item.name) || { name: item.name, score: 0, fastest: Infinity };
      current.score = Math.max(current.score, item.score);
      if (item.cleared && Number.isFinite(item.elapsedMs)) current.fastest = Math.min(current.fastest, item.elapsedMs);
      bestByName.set(item.name, current);
    }
    const rows = [...bestByName.values()]
      .sort((a, b) => Number(Number.isFinite(b.fastest)) - Number(Number.isFinite(a.fastest)) || (Number.isFinite(a.fastest) && Number.isFinite(b.fastest) ? a.fastest - b.fastest : b.score - a.score))
      .slice(0, 7);
    els.leaderboard.replaceChildren();
    if (els.leaderboardTitle) els.leaderboardTitle.textContent = `가족 최고 기록 · ${currentDifficulty().label}`;
    if (!rows.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = '첫 기록을 기다리고 있어요!';
      els.leaderboard.append(li);
      return;
    }
    rows.forEach(row => {
      const li = document.createElement('li');
      const nameSpan = document.createElement('span');
      const pointSpan = document.createElement('span');
      nameSpan.className = 'name';
      pointSpan.className = 'points';
      nameSpan.textContent = row.name;
      pointSpan.textContent = `${row.score.toLocaleString()}점`;
      if (Number.isFinite(row.fastest)) {
        const small = document.createElement('small');
        small.textContent = `🏆 ${formatTime(row.fastest)}`;
        pointSpan.append(small);
      }
      li.append(nameSpan, pointSpan);
      els.leaderboard.append(li);
    });
  }

  function setCanvasResolution() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function randomNext() {
    const weights = currentDifficulty().spawnWeights;
    let value = Math.random();
    for (let type = 0; type < weights.length; type++) {
      value -= weights[type];
      if (value <= 0) return type;
    }
    return weights.length - 1;
  }

  function updateNextAvatar() {
    const difficulty = currentDifficulty();
    nextType = nextQueue[0] ?? 0;
    els.next.className = `avatar ${TYPES[nextQueue[0] ?? 0].css}`;
    els.next2.className = `avatar secondary-next ${TYPES[nextQueue[1] ?? 0].css}`;
    els.next.setAttribute('aria-label', `다음 캐릭터: ${TYPES[nextQueue[0] ?? 0].name}`);
    els.next2.setAttribute('aria-label', `그다음 캐릭터: ${TYPES[nextQueue[1] ?? 0].name}`);
    els.nextCard.classList.toggle('preview-one', difficulty.previewCount === 1);
    els.nextCard.classList.toggle('preview-none', difficulty.previewCount === 0);
    els.nextHelp.textContent = difficulty.previewCount === 2
      ? '두 수 앞까지 보고 천천히 준비하세요.'
      : difficulty.previewCount === 1
        ? '같은 얼굴끼리 만나면 합체해요.'
        : '다음 캐릭터는 떨어질 때 공개됩니다.';
  }

  function resetGame() {
    pieces = [];
    particles = [];
    score = 0;
    dangerTime = 0;
    gameOver = false;
    finishing = false;
    running = true;
    canDrop = true;
    gameStartedAt = performance.now();
    elapsedMs = 0;
    dropX = W / 2;
    nextQueue = [randomNext(), randomNext()];
    nextType = nextQueue[0];
    els.score.textContent = '0';
    els.time.textContent = formatTime(0);
    els.best.textContent = personalBest(playerName).toLocaleString();
    updateNextAvatar();
  }

  function beginFor(name) {
    const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked')?.value || difficultyKey;
    setDifficulty(selectedDifficulty);
    playerName = name.trim().slice(0, 12) || '가족';
    localStorage.setItem(LAST_PLAYER_KEY, playerName);
    els.player.textContent = playerName;
    els.startModal.classList.remove('visible');
    els.gameOverModal.classList.remove('visible');
    resetGame();
    unlockAudio();
  }

  function dropPiece() {
    if (!running || gameOver || !canDrop) return;
    const type = nextType;
    const r = radiusFor(type);
    pieces.push({
      x: Math.max(r + 5, Math.min(W - r - 5, dropX)),
      y: 52,
      vx: 0,
      vy: 0,
      r,
      type,
      age: 0,
      pulse: 1
    });
    canDrop = false;
    nextQueue.shift();
    nextQueue.push(randomNext());
    nextType = nextQueue[0];
    updateNextAvatar();
    tone(230, .035, .045);
    window.setTimeout(() => { if (!gameOver) canDrop = true; }, 560);
  }

  function update(dt) {
    if (!running || gameOver) return;
    elapsedMs = performance.now() - gameStartedAt;
    els.time.textContent = formatTime(elapsedMs);
    const steps = 3;
    const step = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (const p of pieces) {
        p.age += step;
        p.pulse = Math.max(0, p.pulse - step * 3.5);
        p.vy += 1000 * step;
        p.vx *= Math.pow(.996, step * 60);
        p.vy *= Math.pow(.999, step * 60);
        p.x += p.vx * step;
        p.y += p.vy * step;

        if (p.x - p.r < 5) {
          p.x = p.r + 5;
          if (p.vx < 0) p.vx *= -.24;
        } else if (p.x + p.r > W - 5) {
          p.x = W - p.r - 5;
          if (p.vx > 0) p.vx *= -.24;
        }
        if (p.y + p.r > H - 7) {
          p.y = H - p.r - 7;
          if (p.vy > 0) p.vy *= -.18;
          p.vx *= .975;
        }
      }

      for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < pieces.length; i++) {
          for (let j = i + 1; j < pieces.length; j++) {
            resolveCollision(pieces[i], pieces[j]);
          }
        }
      }
      mergeTouching();
      if (finishing) return;
    }

    for (const part of particles) {
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vy += 260 * dt;
    }
    particles = particles.filter(p => p.life > 0);

    const danger = pieces.some(p => p.age > 1.7 && p.y - p.r < DANGER_Y && Math.hypot(p.vx, p.vy) < 90);
    dangerTime = danger ? dangerTime + dt : Math.max(0, dangerTime - dt * 2.2);
    if (dangerTime > currentDifficulty().grace) finishGame();
  }

  function resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDist = a.r + b.r;
    const distSq = dx * dx + dy * dy;
    if (distSq <= 0 || distSq >= minDist * minDist) return;
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    const massA = a.r * a.r;
    const massB = b.r * b.r;
    const total = massA + massB;
    a.x -= nx * overlap * (massB / total) * .52;
    a.y -= ny * overlap * (massB / total) * .52;
    b.x += nx * overlap * (massA / total) * .52;
    b.y += ny * overlap * (massA / total) * .52;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const along = rvx * nx + rvy * ny;
    if (along >= 0) return;
    const impulse = -(1.12 * along) / (1 / massA + 1 / massB);
    a.vx -= impulse * nx / massA;
    a.vy -= impulse * ny / massA;
    b.vx += impulse * nx / massB;
    b.vy += impulse * ny / massB;
  }

  function mergeTouching() {
    const used = new Set();
    const additions = [];
    let clearReached = false;
    for (let i = 0; i < pieces.length; i++) {
      if (used.has(i)) continue;
      for (let j = i + 1; j < pieces.length; j++) {
        if (used.has(j)) continue;
        const a = pieces[i];
        const b = pieces[j];
        if (a.type !== b.type || a.type >= TYPES.length - 1 || a.age < .12 || b.age < .12) continue;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist > a.r + b.r + 1) continue;
        used.add(i);
        used.add(j);
        const newType = a.type + 1;
        const x = (a.x + b.x) / 2;
        const y = (a.y + b.y) / 2;
        additions.push({
          x, y,
          vx: (a.vx + b.vx) * .24,
          vy: Math.min(-55, (a.vy + b.vy) * .15 - 45),
          r: radiusFor(newType),
          type: newType,
          age: 0,
          pulse: 1
        });
        const gained = Math.max(1, Math.round(TYPES[newType].points * currentDifficulty().scoreMultiplier));
        score += gained;
        els.score.textContent = score.toLocaleString();
        els.best.textContent = Math.max(score, personalBest(playerName)).toLocaleString();
        burst(x, y, TYPES[newType].color);
        tone(320 + newType * 120, .09, .08);
        showMessage(`${TYPES[newType].name} 합체! +${gained}`);
        if (newType === TYPES.length - 1) clearReached = true;
        break;
      }
      if (clearReached) break;
    }
    if (used.size) pieces = pieces.filter((_, i) => !used.has(i)).concat(additions);
    if (clearReached && !finishing) {
      elapsedMs = performance.now() - gameStartedAt;
      els.time.textContent = formatTime(elapsedMs);
      finishing = true;
      running = false;
      canDrop = false;
      showMessage('메타그로스 완성! 게임 클리어!');
      const finalPiece = additions[additions.length - 1];
      if (finalPiece) {
        for (let i = 0; i < 5; i++) burst(finalPiece.x, finalPiece.y, ['#ffe268', '#76d94d', '#48a9ff', '#ff69aa', '#ffffff'][i]);
      }
      tone(880, .35, .11);
      window.setTimeout(() => finishGame(true), 900);
    }
  }

  function burst(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.PI * 2 * i / 12 + Math.random() * .25;
      const speed = 65 + Math.random() * 95;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 45, life: .65 + Math.random() * .25, color });
    }
  }

  function showMessage(text) {
    els.gameMessage.textContent = text;
    els.gameMessage.classList.add('show');
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => els.gameMessage.classList.remove('show'), 680);
  }

  function finishGame(cleared = false) {
    if (gameOver) return;
    gameOver = true;
    running = false;
    finishing = false;
    elapsedMs = elapsedMs || performance.now() - gameStartedAt;
    const records = saveScore(playerName, score, elapsedMs, cleared);
    els.finalPlayer.textContent = playerName;
    els.finalScore.textContent = score.toLocaleString();
    els.finalTime.textContent = `수행 시간 ${formatTime(elapsedMs)}`;
    els.resultDifficulty.textContent = `${currentDifficulty().label} 난이도`;
    els.resultIcon.textContent = cleared ? '🏆' : '★';
    els.resultEyebrow.textContent = cleared ? 'GAME CLEAR' : 'GAME OVER';
    els.resultTitle.textContent = cleared ? '메타그로스 완성!' : '아슬아슬했어요!';
    if (records.timeRecord) {
      els.recordMessage.textContent = '새로운 최단 클리어 기록이에요!';
    } else if (records.scoreRecord) {
      els.recordMessage.textContent = '새로운 개인 최고 점수예요!';
    } else if (cleared) {
      els.recordMessage.textContent = `내 최단 기록 ${formatTime(personalFastestClear(playerName))}`;
    } else {
      els.recordMessage.textContent = `개인 최고 ${personalBest(playerName).toLocaleString()}점`;
    }
    els.best.textContent = personalBest(playerName).toLocaleString();
    els.gameOverModal.classList.add('visible');
    tone(cleared ? 740 : 180, cleared ? .28 : .18, .09);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackdrop();
    if (running && !gameOver) drawDropGuide();
    for (const p of pieces) drawPiece(p);
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / .8);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBackdrop() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#173e6a');
    grad.addColorStop(.55, '#0e2a4c');
    grad.addColorStop(1, '#091d37');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,.025)';
    for (let y = 20; y < H; y += 42) {
      for (let x = (y / 42 % 2) * 21; x < W; x += 42) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = dangerTime > 0 ? `rgba(255, 106, 138, ${.35 + Math.min(.5, dangerTime / 2)})` : 'rgba(255, 126, 154, .28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, DANGER_Y);
    ctx.lineTo(W - 10, DANGER_Y);
    ctx.stroke();
    ctx.restore();

    const floorGrad = ctx.createLinearGradient(0, H - 28, 0, H);
    floorGrad.addColorStop(0, 'rgba(79, 170, 255, 0)');
    floorGrad.addColorStop(1, 'rgba(79, 170, 255, .14)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H - 34, W, 34);
  }

  function drawDropGuide() {
    const type = TYPES[nextType];
    const radius = radiusFor(nextType);
    const x = Math.max(radius + 5, Math.min(W - radius - 5, dropX));
    ctx.save();
    if (currentDifficulty().showGuide) {
      ctx.setLineDash([5, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,.20)';
      ctx.beginPath();
      ctx.moveTo(x, 62);
      ctx.lineTo(x, H - 12);
      ctx.stroke();
    }
    ctx.globalAlpha = canDrop ? .72 : .28;
    drawCharacterCircle(x, 48, radius, nextType, 0);
    ctx.restore();
  }

  function drawPiece(p) {
    drawCharacterCircle(p.x, p.y, p.r, p.type, p.pulse);
  }

  function drawCharacterCircle(x, y, r, typeIndex, pulse) {
    const type = TYPES[typeIndex];
    const scale = 1 + pulse * .07;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.shadowColor = 'rgba(0,0,0,.38)';
    ctx.shadowBlur = Math.max(8, r * .22);
    ctx.shadowOffsetY = Math.max(4, r * .10);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = type.color;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
    ctx.clip();
    const sourceImage = imageBank[type.image];
    if (sourceImage?.complete && sourceImage.naturalWidth) {
      const [sx, sy, sw, sh] = type.crop;
      ctx.drawImage(sourceImage, sx, sy, sw, sh, -r, -r, r * 2, r * 2);
    } else {
      ctx.fillStyle = type.color;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.fillStyle = '#10203a';
      ctx.font = `900 ${Math.max(14, r * .55)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type.name[0], 0, 1);
    }
    ctx.restore();

    ctx.lineWidth = Math.max(2.5, r * .065);
    ctx.strokeStyle = type.color;
    ctx.beginPath();
    ctx.arc(0, 0, r - 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(255,255,255,.52)';
    ctx.beginPath();
    ctx.arc(0, 0, r - 5, Math.PI * 1.05, Math.PI * 1.78);
    ctx.stroke();
    ctx.restore();
  }

  function loop(now) {
    const dt = Math.min(.028, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function pointerX(event) {
    const rect = canvas.getBoundingClientRect();
    return (event.clientX - rect.left) * W / rect.width;
  }

  function unlockAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    if (audioContext?.state === 'suspended') audioContext.resume();
  }

  function tone(frequency, duration, volume) {
    if (!soundOn) return;
    unlockAudio();
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.12, audioContext.currentTime + duration);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  }

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = tool => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
      } catch {}
    };
    register({
      name: 'start_family_game',
      title: '가족 게임 시작',
      description: '지정한 플레이어 이름으로 새 가족 합체 게임을 시작합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          playerName: { type: 'string', minLength: 1, maxLength: 12 },
          difficulty: { type: 'string', enum: ['easy', 'normal', 'challenge'] }
        },
        required: ['playerName'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input) {
        const name = typeof input?.playerName === 'string' ? input.playerName.trim() : '';
        if (!name || name.length > 12) throw new Error('플레이어 이름은 1~12자로 입력해 주세요.');
        if (input?.difficulty) setDifficulty(input.difficulty);
        beginFor(name);
        return { status: 'started', playerName: name, difficulty: difficultyKey };
      }
    });
    register({
      name: 'read_family_high_scores',
      title: '가족 최고 기록 확인',
      description: '이 기기에 저장된 가족별 최고 점수를 확인합니다.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute() {
        const bestByName = new Map();
        for (const item of loadScores()) {
          const itemDifficulty = scoreDifficulty(item);
          const key = `${itemDifficulty}\u0000${item.name}`;
          const current = bestByName.get(key) || { name: item.name, difficulty: itemDifficulty, points: 0, fastestClearMs: null };
          current.points = Math.max(current.points, item.score);
          if (item.cleared && Number.isFinite(item.elapsedMs)) {
            current.fastestClearMs = current.fastestClearMs === null ? item.elapsedMs : Math.min(current.fastestClearMs, item.elapsedMs);
          }
          bestByName.set(key, current);
        }
        return {
          scores: [...bestByName.values()]
            .sort((a, b) => b.points - a.points)
            .slice(0, 7)
        };
      }
    });
  }

  canvas.addEventListener('pointermove', event => {
    if (!running || gameOver) return;
    dropX = pointerX(event);
  });
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (!running || gameOver) return;
    dropX = pointerX(event);
    dropPiece();
  });
  window.addEventListener('keydown', event => {
    if (!running || gameOver || els.startModal.classList.contains('visible')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); dropX = Math.max(15, dropX - 18); }
    if (event.key === 'ArrowRight') { event.preventDefault(); dropX = Math.min(W - 15, dropX + 18); }
    if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); dropPiece(); }
  });

  document.querySelectorAll('[data-name]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-name]').forEach(b => b.classList.remove('selected'));
      button.classList.add('selected');
      els.playerInput.value = button.dataset.name;
    });
  });

  els.playerInput.addEventListener('input', () => {
    document.querySelectorAll('[data-name]').forEach(b => b.classList.toggle('selected', b.dataset.name === els.playerInput.value.trim()));
  });
  els.playerInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') els.startButton.click();
  });
  document.querySelectorAll('input[name="difficulty"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked) setDifficulty(input.value);
    });
  });
  els.startButton.addEventListener('click', () => {
    const name = els.playerInput.value.trim();
    if (!name) {
      els.playerInput.focus();
      els.playerInput.setAttribute('placeholder', '먼저 이름을 입력해 주세요');
      return;
    }
    beginFor(name);
  });
  els.retryButton.addEventListener('click', () => {
    els.gameOverModal.classList.remove('visible');
    resetGame();
  });
  els.changePlayerButton.addEventListener('click', () => {
    els.gameOverModal.classList.remove('visible');
    els.startModal.classList.add('visible');
    els.playerInput.focus();
  });
  els.newGameButton.addEventListener('click', () => {
    if (running && score > 0) {
      elapsedMs = performance.now() - gameStartedAt;
      saveScore(playerName, score, elapsedMs, false);
    }
    running = false;
    gameOver = false;
    els.gameOverModal.classList.remove('visible');
    els.startModal.classList.add('visible');
    els.playerInput.value = playerName || localStorage.getItem(LAST_PLAYER_KEY) || '';
  });
  els.clearScoresButton.addEventListener('click', () => {
    if (confirm('이 기기에 저장된 가족 기록을 모두 지울까요?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderLeaderboard();
      els.best.textContent = '0';
    }
  });
  els.soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    els.soundButton.textContent = soundOn ? '♪' : '×';
    els.soundButton.setAttribute('aria-label', soundOn ? '소리 끄기' : '소리 켜기');
    if (soundOn) tone(420, .06, .05);
  });

  window.addEventListener('resize', setCanvasResolution);
  Object.values(imageBank).forEach(img => img.addEventListener('load', draw));
  els.playerInput.value = localStorage.getItem(LAST_PLAYER_KEY) || '';
  setDifficulty(localStorage.getItem(LAST_DIFFICULTY_KEY) || 'normal', false);
  setCanvasResolution();
  updateNextAvatar();
  registerWebMcp();
  requestAnimationFrame(loop);
})();
