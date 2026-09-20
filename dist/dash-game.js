(() => {
  'use strict';

  const W = 960;
  const H = 480;
  const GROUND_Y = 400;
  const PLAYER_X = 150;
  const PLAYER_SIZE = 48;
  const STORAGE_KEY = 'cho-family-dash-records-v1';
  const LAST_PLAYER_KEY = 'cho-family-merge-last-player';
  const LAST_DIFFICULTY_KEY = 'cho-family-dash-last-difficulty';
  const LAST_CHARACTER_KEY = 'cho-family-dash-last-character';

  const DIFFICULTIES = {
    easy: { label: 'かんたん', speed: 225, gravity: 1780, jump: 745, finish: 7200, color: '#76d94d' },
    normal: { label: 'ふつう', speed: 270, gravity: 1950, jump: 800, finish: 9000, color: '#48a9ff' },
    challenge: { label: 'チャレンジ', speed: 320, gravity: 2100, jump: 845, finish: 11000, color: '#ff69aa' }
  };

  const STAGE_FINISH = {
    1: { easy: 3400, normal: 4100, challenge: 4800 },
    2: { easy: 5000, normal: 6200, challenge: 7400 }
  };

  const CHARACTERS = {
    son: { name: '末っ子', color: '#76d94d', image: 'family', crop: [627, 627, 627, 627] },
    second: { name: '次女', color: '#ff69aa', image: 'family', crop: [0, 627, 627, 627] },
    first: { name: '長女', color: '#48a9ff', image: 'family', crop: [627, 0, 627, 627] },
    wife: { name: 'お母さん', color: '#ffbf32', image: 'family', crop: [0, 0, 627, 627] },
    dad: { name: 'お父さん', color: '#168cff', image: 'dad', crop: [0, 0, 1254, 1254] },
    grandma: { name: 'おばあちゃん', color: '#b255e7', image: 'grandparents', crop: [627, 215, 627, 627] },
    grandpa: { name: 'おじいちゃん', color: '#f2a21a', image: 'grandparents', crop: [0, 215, 627, 627] }
  };

  const imageBank = { family: new Image(), dad: new Image(), grandparents: new Image() };
  imageBank.family.src = './assets/family-characters.png';
  imageBank.dad.src = './assets/dad-character.png';
  imageBank.grandparents.src = './assets/grandparents-characters.png';

  const canvas = document.getElementById('dashCanvas');
  const ctx = canvas.getContext('2d');
  const dashApp = document.getElementById('dashApp');
  const els = {
    player: document.getElementById('dashPlayerDisplay'),
    difficulty: document.getElementById('dashDifficultyDisplay'),
    stage: document.getElementById('dashStageDisplay'),
    progress: document.getElementById('dashProgressDisplay'),
    attempt: document.getElementById('dashAttemptDisplay'),
    time: document.getElementById('dashTimeDisplay'),
    overlay: document.getElementById('dashOverlay'),
    bestProgress: document.getElementById('dashBestProgress'),
    bestTime: document.getElementById('dashBestTime'),
    selectedAvatar: document.getElementById('dashSelectedAvatar'),
    characterName: document.getElementById('dashCharacterName'),
    startModal: document.getElementById('dashStartModal'),
    resultModal: document.getElementById('dashResultModal'),
    playerInput: document.getElementById('dashPlayerNameInput'),
    startButton: document.getElementById('dashStartButton'),
    retryButton: document.getElementById('dashRetryButton'),
    changePlayerButton: document.getElementById('dashChangePlayerButton'),
    newGameButton: document.getElementById('dashNewGameButton'),
    soundButton: document.getElementById('dashSoundButton'),
    clearRecordsButton: document.getElementById('dashClearRecordsButton'),
    finalPlayer: document.getElementById('dashFinalPlayer'),
    finalProgress: document.getElementById('dashFinalProgress'),
    finalTime: document.getElementById('dashFinalTime'),
    resultDifficulty: document.getElementById('dashResultDifficulty'),
    resultIcon: document.getElementById('dashResultIcon'),
    resultEyebrow: document.getElementById('dashResultEyebrow'),
    resultTitle: document.getElementById('dashResultTitle'),
    recordMessage: document.getElementById('dashRecordMessage')
  };

  let playerName = '';
  let difficultyKey = 'normal';
  let characterKey = 'son';
  let stage = 1;
  let obstacles = [];
  let particles = [];
  let distance = 0;
  let attempt = 1;
  let elapsedMs = 0;
  let attemptStartedAt = 0;
  let running = false;
  let crashed = false;
  let cleared = false;
  let onGround = true;
  let rotation = 0;
  let restartTimer = 0;
  let resultTimer = 0;
  let beatTimer = 0;
  let beatIndex = 0;
  let lastFrame = performance.now();
  let soundOn = true;
  let audioContext = null;
  let lastGroundedAt = performance.now();
  let jumpQueuedUntil = 0;
  const player = { y: GROUND_Y - PLAYER_SIZE, vy: 0 };

  function currentDifficulty() { return DIFFICULTIES[difficultyKey]; }
  function currentCharacter() { return CHARACTERS[characterKey]; }
  function currentFinish() { return STAGE_FINISH[stage][difficultyKey]; }

  function overallProgress() {
    const stageProgress = Math.min(1, distance / currentFinish());
    return stage === 1 ? Math.floor(stageProgress * 50) : 50 + Math.floor(stageProgress * 50);
  }

  function formatTime(ms) {
    const safe = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const tenths = Math.floor((safe % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  function loadRecords() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function recordFor(name = playerName, key = difficultyKey) {
    return loadRecords().find(item => item.name === name && item.difficulty === key) || null;
  }

  function saveRecord(progress, clearTime = null) {
    if (!playerName) return { progressRecord: false, timeRecord: false };
    const records = loadRecords();
    let item = records.find(record => record.name === playerName && record.difficulty === difficultyKey);
    if (!item) {
      item = { name: playerName, difficulty: difficultyKey, bestProgress: 0, bestTime: null, plays: 0, updatedAt: 0 };
      records.push(item);
    }
    const progressRecord = progress > item.bestProgress;
    const timeRecord = Number.isFinite(clearTime) && (item.bestTime === null || clearTime < item.bestTime);
    item.bestProgress = Math.max(item.bestProgress, progress);
    if (timeRecord) item.bestTime = Math.floor(clearTime);
    item.plays += 1;
    item.character = characterKey;
    item.updatedAt = Date.now();
    records.sort((a, b) => b.bestProgress - a.bestProgress || (a.bestTime ?? Infinity) - (b.bestTime ?? Infinity));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 60)));
    renderRecord();
    return { progressRecord, timeRecord };
  }

  function renderRecord() {
    const record = recordFor();
    els.bestProgress.textContent = `${record?.bestProgress || 0}%`;
    els.bestTime.textContent = Number.isFinite(record?.bestTime) ? formatTime(record.bestTime) : '--:--.-';
  }

  function addSpike(x) {
    obstacles.push({ type: 'spike', x, y: GROUND_Y - 42, w: 42, h: 42 });
  }

  function addBlock(x, w = 72, h = 72) {
    obstacles.push({ type: 'block', x, y: GROUND_Y - h, w, h });
  }

  function addPad(x) {
    obstacles.push({ type: 'pad', x, y: GROUND_Y - 12, w: 58, h: 12 });
  }

  function addPattern(name, x) {
    if (name === 'spike') addSpike(x);
    if (name === 'double') { addSpike(x); addSpike(x + 44); }
    if (name === 'triple') { addSpike(x); addSpike(x + 44); addSpike(x + 88); }
    if (name === 'block') addBlock(x, 74, 68);
    if (name === 'tall') addBlock(x, 76, 104);
    if (name === 'block-spike') { addBlock(x, 78, 66); addSpike(x + 112); }
    if (name === 'steps') { addBlock(x, 72, 56); addBlock(x + 106, 72, 92); }
    if (name === 'pad-wall') { addPad(x); addBlock(x + 180, 82, 150); }
    if (name === 'gate') { addSpike(x); addBlock(x + 108, 70, 76); addSpike(x + 212); }
  }

  function buildLevel() {
    obstacles = [];
    const spikeSequences = {
      easy: ['spike', 'spike', 'double', 'spike'],
      normal: ['spike', 'double', 'spike', 'double', 'triple'],
      challenge: ['double', 'spike', 'triple', 'double', 'triple']
    };
    const advancedSequences = {
      easy: ['block', 'spike', 'pad-wall', 'block-spike', 'steps'],
      normal: ['block-spike', 'pad-wall', 'tall', 'gate', 'steps', 'pad-wall'],
      challenge: ['pad-wall', 'block-spike', 'gate', 'steps', 'tall', 'pad-wall', 'gate']
    };
    const stageGaps = stage === 1
      ? { easy: 480, normal: 420, challenge: 365 }
      : { easy: 445, normal: 380, challenge: 325 };
    const sequence = (stage === 1 ? spikeSequences : advancedSequences)[difficultyKey];
    let x = 720;
    let index = 0;
    while (x < currentFinish() - 650) {
      addPattern(sequence[index % sequence.length], x);
      x += stageGaps[difficultyKey] + (index % 3) * 28;
      index += 1;
    }
  }

  function setDifficulty(key, persist = true) {
    difficultyKey = DIFFICULTIES[key] ? key : 'normal';
    if (persist) localStorage.setItem(LAST_DIFFICULTY_KEY, difficultyKey);
    document.querySelectorAll('input[name="dashDifficulty"]').forEach(input => {
      input.checked = input.value === difficultyKey;
    });
    els.difficulty.textContent = currentDifficulty().label;
    els.difficulty.className = `difficulty-badge ${difficultyKey}`;
    renderRecord();
  }

  function setCharacter(key, persist = true) {
    characterKey = CHARACTERS[key] ? key : 'son';
    if (persist) localStorage.setItem(LAST_CHARACTER_KEY, characterKey);
    document.querySelectorAll('input[name="dashCharacter"]').forEach(input => {
      input.checked = input.value === characterKey;
    });
    els.selectedAvatar.innerHTML = `<span class="avatar ${characterKey}"></span>`;
    els.selectedAvatar.style.borderColor = currentCharacter().color;
    els.characterName.textContent = `${currentCharacter().name}キューブ`;
  }

  function setCanvasResolution() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startGame() {
    const name = els.playerInput.value.trim();
    if (!name) {
      els.playerInput.focus();
      els.playerInput.placeholder = '先に名前を入力してください';
      return;
    }
    playerName = name.slice(0, 12);
    localStorage.setItem(LAST_PLAYER_KEY, playerName);
    setDifficulty(document.querySelector('input[name="dashDifficulty"]:checked')?.value || difficultyKey);
    setCharacter(document.querySelector('input[name="dashCharacter"]:checked')?.value || characterKey);
    els.player.textContent = playerName;
    els.startModal.classList.remove('visible');
    els.resultModal.classList.remove('visible');
    stage = 1;
    attempt = 1;
    buildLevel();
    beginAttempt(false);
    unlockAudio();
  }

  function beginAttempt(increment = true) {
    clearTimeout(restartTimer);
    if (increment) attempt += 1;
    distance = 0;
    elapsedMs = 0;
    attemptStartedAt = performance.now();
    player.y = GROUND_Y - PLAYER_SIZE;
    player.vy = 0;
    rotation = 0;
    onGround = true;
    lastGroundedAt = performance.now();
    jumpQueuedUntil = 0;
    running = true;
    crashed = false;
    cleared = false;
    particles = [];
    beatTimer = 0;
    beatIndex = 0;
    els.attempt.textContent = `${attempt}回`;
    els.stage.textContent = `${stage} / 2`;
    els.progress.textContent = '0%';
    els.time.textContent = formatTime(0);
    els.overlay.textContent = attempt === 1
      ? (stage === 1 ? 'ステージ1　トゲをジャンプ！' : 'ステージ2　ブロックコース！')
      : '';
    els.overlay.className = attempt === 1 ? 'dash-overlay show' : 'dash-overlay';
    window.setTimeout(() => {
      if (running) els.overlay.classList.remove('show');
    }, 1300);
    renderRecord();
  }

  function unlockAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    if (audioContext?.state === 'suspended') audioContext.resume();
  }

  function tone(frequency, duration = .06, volume = .04) {
    if (!soundOn) return;
    unlockAudio();
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  }

  function performJump() {
    player.vy = -currentDifficulty().jump;
    onGround = false;
    jumpQueuedUntil = 0;
    tone(420, .05, .035);
  }

  function jumpOrRestart() {
    if (dashApp.hidden || els.startModal.classList.contains('visible') || els.resultModal.classList.contains('visible')) return;
    unlockAudio();
    if (crashed) {
      beginAttempt(true);
      return;
    }
    if (!running) return;
    const now = performance.now();
    if (onGround || now - lastGroundedAt <= 90) {
      performJump();
      return;
    }
    jumpQueuedUntil = now + 130;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function crash() {
    if (!running) return;
    running = false;
    crashed = true;
    const progress = Math.min(99, overallProgress());
    const stageProgress = Math.min(99, Math.floor(distance / currentFinish() * 100));
    saveRecord(progress);
    els.overlay.textContent = `ステージ${stage}　${stageProgress}%　ミス！`;
    els.overlay.className = 'dash-overlay show crash';
    for (let i = 0; i < 18; i++) {
      const angle = Math.PI * 2 * i / 18;
      const speed = 90 + Math.random() * 170;
      particles.push({
        x: PLAYER_X + PLAYER_SIZE / 2,
        y: player.y + PLAYER_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: .75 + Math.random() * .35,
        color: currentCharacter().color
      });
    }
    tone(120, .22, .07);
    restartTimer = window.setTimeout(() => {
      if (crashed && !dashApp.hidden) beginAttempt(true);
    }, 850);
  }

  function finishLevel() {
    if (!running) return;
    running = false;
    cleared = true;
    distance = currentFinish();
    elapsedMs = performance.now() - attemptStartedAt;
    const firstStage = stage === 1;
    const records = saveRecord(firstStage ? 50 : 100, firstStage ? null : elapsedMs);
    els.progress.textContent = '100%';
    els.overlay.textContent = firstStage ? 'ステージ1 クリア！' : '全ステージ クリア！';
    els.overlay.className = 'dash-overlay show clear';
    tone(660, .10, .06);
    window.setTimeout(() => tone(880, .18, .06), 120);
    resultTimer = window.setTimeout(() => {
      els.finalPlayer.textContent = playerName;
      els.finalProgress.textContent = firstStage ? 'ステージ1 クリア' : '100%';
      els.finalTime.textContent = `クリアタイム ${formatTime(elapsedMs)}・${attempt}回目`;
      els.resultDifficulty.textContent = `難易度：${currentDifficulty().label}・ステージ${stage}`;
      els.resultIcon.textContent = firstStage ? '⭐' : '🏁';
      els.resultEyebrow.textContent = firstStage ? '次のステージへ' : '全ステージクリア';
      els.resultTitle.textContent = firstStage ? 'ステージ1 クリア！' : 'ゴール！';
      els.recordMessage.textContent = firstStage
        ? '次は青いブロックと黄色いジャンプ台が登場します！'
        : (records.timeRecord ? '最速クリア記録を更新しました！' : '全ステージクリア、おめでとう！');
      els.retryButton.textContent = firstStage ? 'ステージ2へ' : 'ステージ1からもう一度';
      els.resultModal.classList.add('visible');
    }, 500);
  }

  function update(dt) {
    if (!running) {
      updateParticles(dt);
      return;
    }
    const difficulty = currentDifficulty();
    const previousY = player.y;
    const previousBottom = previousY + PLAYER_SIZE;
    elapsedMs = performance.now() - attemptStartedAt;
    distance += difficulty.speed * dt;
    player.vy += difficulty.gravity * dt;
    player.y += player.vy * dt;
    onGround = false;

    if (player.y + PLAYER_SIZE >= GROUND_Y) {
      player.y = GROUND_Y - PLAYER_SIZE;
      player.vy = 0;
      onGround = true;
    }

    const playerRect = { x: PLAYER_X + 5, y: player.y + 5, w: PLAYER_SIZE - 10, h: PLAYER_SIZE - 10 };
    for (const obstacle of obstacles) {
      const screenX = obstacle.x - distance + PLAYER_X;
      if (screenX > W + 100 || screenX + obstacle.w < PLAYER_X - 100) continue;
      if (obstacle.type === 'pad') {
        if (playerRect.x + playerRect.w > screenX && playerRect.x < screenX + obstacle.w && player.y + PLAYER_SIZE >= obstacle.y - 2 && player.vy >= 0) {
          player.y = obstacle.y - PLAYER_SIZE;
          player.vy = -difficulty.jump * 1.22;
          onGround = false;
          tone(560, .07, .05);
        }
        continue;
      }
      if (obstacle.type === 'block') {
        const blockRect = { x: screenX, y: obstacle.y, w: obstacle.w, h: obstacle.h };
        const currentBottom = player.y + PLAYER_SIZE;
        const horizontalOverlap = PLAYER_X + PLAYER_SIZE - 5 > screenX && PLAYER_X + 5 < screenX + obstacle.w;
        const landingOnTop = horizontalOverlap && player.vy >= 0 && previousBottom <= obstacle.y + 4 && currentBottom >= obstacle.y - 4;
        if (landingOnTop) {
          player.y = obstacle.y - PLAYER_SIZE;
          player.vy = 0;
          onGround = true;
          continue;
        }
        if (!rectsOverlap(playerRect, blockRect)) continue;
        if (player.vy >= 0 && previousBottom <= obstacle.y + 9) {
          player.y = obstacle.y - PLAYER_SIZE;
          player.vy = 0;
          onGround = true;
        } else {
          crash();
          break;
        }
      }
      if (obstacle.type === 'spike') {
        const spikeRect = { x: screenX + 8, y: obstacle.y + 13, w: obstacle.w - 16, h: obstacle.h - 13 };
        if (rectsOverlap(playerRect, spikeRect)) {
          crash();
          break;
        }
      }
    }

    if (onGround) {
      lastGroundedAt = performance.now();
      if (jumpQueuedUntil >= lastGroundedAt) performJump();
    } else if (jumpQueuedUntil && jumpQueuedUntil < performance.now()) {
      jumpQueuedUntil = 0;
    }

    if (!onGround) {
      rotation += dt * 5.6;
    } else {
      rotation += (Math.round(rotation / (Math.PI / 2)) * (Math.PI / 2) - rotation) * Math.min(1, dt * 18);
    }

    const progress = Math.min(100, Math.floor(distance / currentFinish() * 100));
    els.progress.textContent = `${progress}%`;
    els.time.textContent = formatTime(elapsedMs);
    beatTimer += dt;
    if (beatTimer >= .5) {
      beatTimer -= .5;
      tone(beatIndex++ % 4 === 0 ? 190 : 140, .035, .012);
    }
    updateParticles(dt);
    if (distance >= currentFinish()) finishLevel();
  }

  function updateParticles(dt) {
    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 520 * dt;
    }
    particles = particles.filter(particle => particle.life > 0);
  }

  function roundedRectPath(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#0b1237');
    gradient.addColorStop(.65, '#14265a');
    gradient.addColorStop(1, '#0a1738');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    const gridOffset = -(distance * .25 % 48);
    ctx.strokeStyle = 'rgba(80, 190, 255, .10)';
    ctx.lineWidth = 1;
    for (let x = gridOffset; x < W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GROUND_Y);
      ctx.stroke();
    }
    for (let y = 40; y < GROUND_Y; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const progress = Math.min(1, distance / currentFinish());
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(24, 22, W - 48, 8);
    ctx.fillStyle = currentDifficulty().color;
    ctx.fillRect(24, 22, (W - 48) * progress, 8);
    ctx.fillStyle = '#e9f5ff';
    ctx.font = '800 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(progress * 100)}%`, W - 24, 52);

    ctx.fillStyle = '#0a1230';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = currentDifficulty().color;
    ctx.globalAlpha = .8;
    ctx.fillRect(0, GROUND_Y, W, 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let x = -(distance % 64); x < W; x += 64) ctx.fillRect(x, GROUND_Y + 22, 34, 5);
  }

  function drawObstacles() {
    for (const obstacle of obstacles) {
      const x = obstacle.x - distance + PLAYER_X;
      if (x > W + 80 || x + obstacle.w < -80) continue;
      if (obstacle.type === 'spike') {
        const grad = ctx.createLinearGradient(x, obstacle.y, x, obstacle.y + obstacle.h);
        grad.addColorStop(0, '#ff9ab9');
        grad.addColorStop(1, '#e52c69');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x + obstacle.w / 2, obstacle.y);
        ctx.lineTo(x + obstacle.w, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (obstacle.type === 'block') {
        const grad = ctx.createLinearGradient(x, obstacle.y, x + obstacle.w, obstacle.y + obstacle.h);
        grad.addColorStop(0, '#35d7ff');
        grad.addColorStop(1, '#3156dc');
        ctx.fillStyle = grad;
        ctx.fillRect(x, obstacle.y, obstacle.w, obstacle.h);
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1.5, obstacle.y + 1.5, obstacle.w - 3, obstacle.h - 3);
        ctx.strokeStyle = 'rgba(255,255,255,.16)';
        ctx.strokeRect(x + 10, obstacle.y + 10, obstacle.w - 20, obstacle.h - 20);
      } else if (obstacle.type === 'pad') {
        ctx.fillStyle = '#ffcc42';
        ctx.fillRect(x, obstacle.y, obstacle.w, obstacle.h);
        ctx.fillStyle = '#ff69aa';
        ctx.fillRect(x + 8, obstacle.y + 3, obstacle.w - 16, 4);
      }
    }
  }

  function drawPlayer() {
    if (crashed && particles.length) return;
    const character = currentCharacter();
    const image = imageBank[character.image];
    ctx.save();
    ctx.translate(PLAYER_X + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2);
    ctx.rotate(rotation);
    const pulse = onGround && running ? 1 + Math.sin(performance.now() / 85) * .025 : 1;
    ctx.scale(pulse, 1 / pulse);
    ctx.shadowColor = character.color;
    ctx.shadowBlur = 18;
    roundedRectPath(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE, 10);
    ctx.fillStyle = '#07172c';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save();
    roundedRectPath(-PLAYER_SIZE / 2 + 4, -PLAYER_SIZE / 2 + 4, PLAYER_SIZE - 8, PLAYER_SIZE - 8, 8);
    ctx.clip();
    if (image.complete && image.naturalWidth) {
      const [sx, sy, sw, sh] = character.crop;
      ctx.drawImage(image, sx, sy, sw, sh, -PLAYER_SIZE / 2 + 4, -PLAYER_SIZE / 2 + 4, PLAYER_SIZE - 8, PLAYER_SIZE - 8);
    } else {
      ctx.fillStyle = character.color;
      ctx.fillRect(-20, -20, 40, 40);
    }
    ctx.restore();
    ctx.strokeStyle = character.color;
    ctx.lineWidth = 4;
    roundedRectPath(-PLAYER_SIZE / 2 + 1, -PLAYER_SIZE / 2 + 1, PLAYER_SIZE - 2, PLAYER_SIZE - 2, 10);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - 4, particle.y - 4, 8, 8);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawObstacles();
    drawPlayer();
    drawParticles();
  }

  function loop(now) {
    const dt = Math.min(.03, Math.max(.001, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  const nameCharacterMap = {
    '末っ子': 'son', '次女': 'second', '長女': 'first', 'お母さん': 'wife',
    'お父さん': 'dad', 'おばあちゃん': 'grandma', 'おじいちゃん': 'grandpa'
  };

  document.querySelectorAll('[data-dash-name]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-dash-name]').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
      els.playerInput.value = button.dataset.dashName;
      if (nameCharacterMap[button.dataset.dashName]) setCharacter(nameCharacterMap[button.dataset.dashName]);
    });
  });

  document.querySelectorAll('input[name="dashDifficulty"]').forEach(input => {
    input.addEventListener('change', () => { if (input.checked) setDifficulty(input.value); });
  });
  document.querySelectorAll('input[name="dashCharacter"]').forEach(input => {
    input.addEventListener('change', () => { if (input.checked) setCharacter(input.value); });
  });

  els.playerInput.addEventListener('input', () => {
    document.querySelectorAll('[data-dash-name]').forEach(button => {
      button.classList.toggle('selected', button.dataset.dashName === els.playerInput.value.trim());
    });
  });
  els.playerInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') els.startButton.click();
  });
  els.startButton.addEventListener('click', startGame);
  els.retryButton.addEventListener('click', () => {
    els.resultModal.classList.remove('visible');
    stage = stage === 1 && cleared ? 2 : 1;
    attempt = 1;
    buildLevel();
    beginAttempt(false);
  });
  els.changePlayerButton.addEventListener('click', () => {
    els.resultModal.classList.remove('visible');
    stage = 1;
    els.startModal.classList.add('visible');
  });
  els.newGameButton.addEventListener('click', () => {
    if (running) {
      const progress = Math.min(99, overallProgress());
      if (progress > 0) saveRecord(progress);
    }
    running = false;
    crashed = false;
    clearTimeout(restartTimer);
    clearTimeout(resultTimer);
    stage = 1;
    els.resultModal.classList.remove('visible');
    els.startModal.classList.add('visible');
  });
  els.clearRecordsButton.addEventListener('click', () => {
    if (confirm('ファミリーダッシュの記録をすべて消しますか？')) {
      localStorage.removeItem(STORAGE_KEY);
      renderRecord();
    }
  });
  els.soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    els.soundButton.textContent = soundOn ? '♪' : '×';
    els.soundButton.setAttribute('aria-label', soundOn ? '音を消す' : '音を出す');
    if (soundOn) tone(440, .06, .04);
  });

  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    jumpOrRestart();
  });
  window.addEventListener('keydown', event => {
    if (dashApp.hidden) return;
    if (event.code === 'Space' || event.key === 'ArrowUp') {
      event.preventDefault();
      jumpOrRestart();
    }
  });
  window.addEventListener('resize', setCanvasResolution);
  Object.values(imageBank).forEach(image => image.addEventListener('load', draw));

  window.FamilyDashGame = {
    open() {
      running = false;
      crashed = false;
      clearTimeout(restartTimer);
      clearTimeout(resultTimer);
      els.resultModal.classList.remove('visible');
      els.playerInput.value = localStorage.getItem(LAST_PLAYER_KEY) || playerName || '';
      els.startModal.classList.add('visible');
      renderRecord();
      draw();
    },
    leave() {
      if (running) {
        const progress = Math.min(99, overallProgress());
        if (progress > 0) saveRecord(progress);
      }
      running = false;
      crashed = false;
      stage = 1;
      clearTimeout(restartTimer);
      clearTimeout(resultTimer);
      els.startModal.classList.remove('visible');
      els.resultModal.classList.remove('visible');
    }
  };

  setDifficulty(localStorage.getItem(LAST_DIFFICULTY_KEY) || 'normal', false);
  setCharacter(localStorage.getItem(LAST_CHARACTER_KEY) || 'son', false);
  els.playerInput.value = localStorage.getItem(LAST_PLAYER_KEY) || '';
  setCanvasResolution();
  buildLevel();
  renderRecord();
  requestAnimationFrame(loop);
})();
