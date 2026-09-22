(() => {
  'use strict';
  const W = 960, H = 540;
  const STORE = 'cho-family-pipe-sota-records-v1';
  const DIFF = {
    easy: { label: 'レベル 1', max: 10, count: 9, seconds: 9.5, color: '#76d94d' },
    normal: { label: 'レベル 2', max: 20, count: 12, seconds: 6.9, color: '#48a9ff' },
    challenge: { label: 'レベル 3', max: 20, count: 15, seconds: 4.9, color: '#ff69aa' }
  };
  const STAGES = [
    { name: 'れんしゅうパイプ', op: '+', maxClog: 5, color: '#56c9ff' },
    { name: 'あわあわ ちかすいろ', op: '-', maxClog: 4, color: '#9b7bea' },
    { name: 'だいつまりモンスター', op: 'mix', maxClog: 3, color: '#ff6e9e' }
  ];
  const CHARACTERS = { son: '末っ子', second: '次女', first: '長女', wife: 'お母さん', dad: 'お父さん', grandma: 'おばあちゃん', grandpa: 'おじいちゃん' };
  const canvas = document.getElementById('mathCanvas'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const el = {
    player: $('mathPlayerDisplay'), diff: $('mathDifficultyDisplay'), stage: $('mathStageDisplay'), question: $('mathQuestionDisplay'), score: $('mathScoreDisplay'), time: $('mathTimeDisplay'),
    feedback: $('mathFeedback'), avatar: $('mathSelectedAvatar'), character: $('mathCharacterName'), stageName: $('mathStageName'), streak: $('mathStreakDisplay'), clog: $('mathProgressTrack'), tip: $('mathTip'),
    rankTitle: $('mathRankingTitle'), board: $('mathLeaderboard'), clear: $('mathClearRecordsButton'), sound: $('mathSoundButton'), newGame: $('mathNewGameButton'),
    start: $('mathStartModal'), result: $('mathResultModal'), input: $('mathPlayerNameInput'), startButton: $('mathStartButton'), retry: $('mathRetryButton'), change: $('mathChangePlayerButton'),
    finalPlayer: $('mathFinalPlayer'), finalScore: $('mathFinalScore'), finalTime: $('mathFinalTime'), detail: $('mathResultDetail'), record: $('mathRecordMessage'), resultTitle: $('mathResultTitle'), resultEyebrow: $('mathResultEyebrow')
  };
  const valves = [{ x: 125, y: 420, w: 210, h: 90 }, { x: 375, y: 420, w: 210, h: 90 }, { x: 625, y: 420, w: 210, h: 90 }];
  let visible = false, running = false, difficultyKey = 'normal', characterKey = 'son', playerName = '';
  let index = 0, question, pipeY = 112, score = 0, streak = 0, bestStreak = 0, clog = 0, startAt = 0, elapsed = 0, resolveAt = 0, right = -1, wrong = -1, lastEquation = '', lastFrame = performance.now(), soundOn = true, audio;
  const d = () => DIFF[difficultyKey];
  const sIndex = () => Math.min(2, Math.floor(index / (d().count / 3)));
  const stage = () => STAGES[sIndex()];
  const seconds = () => Math.max(3.2, d().seconds - sIndex() * 1.25);
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const fmt = n => `${String(Math.floor(n / 60000)).padStart(2, '0')}:${String(Math.floor(n % 60000 / 1000)).padStart(2, '0')}.${Math.floor(n % 1000 / 100)}`;
  function records() { try { const value = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
  function renderRank() {
    const list = records().filter(r => r.level === difficultyKey).sort((a, b) => b.score - a.score || a.time - b.time).slice(0, 7);
    el.rankTitle.textContent = `ランキング・${d().label}`; el.board.replaceChildren();
    if (!list.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'まだ きろくが ありません'; el.board.append(li); return; }
    list.forEach(r => { const li = document.createElement('li'), name = document.createElement('span'), points = document.createElement('span'), time = document.createElement('small'); name.className = 'name'; points.className = 'points'; name.textContent = r.name; points.textContent = `${r.score}てん`; time.textContent = fmt(r.time); points.append(time); li.append(name, points); el.board.append(li); });
  }
  function setDiff(key, save = true) {
    difficultyKey = DIFF[key] ? key : 'normal'; if (save) localStorage.setItem('cho-family-pipe-sota-level', difficultyKey);
    el.diff.textContent = d().label; el.diff.className = `difficulty-badge ${difficultyKey}`;
    document.querySelectorAll('input[name="mathDifficulty"]').forEach(i => i.checked = i.value === difficultyKey); renderRank();
  }
  function setCharacter(key, save = true) {
    characterKey = CHARACTERS[key] ? key : 'son'; if (save) localStorage.setItem('cho-family-pipe-sota-character', characterKey);
    el.avatar.innerHTML = `<span class="avatar ${characterKey}"></span>`; el.character.textContent = `${CHARACTERS[characterKey]}と そうた`;
    document.querySelectorAll('input[name="mathCharacter"]').forEach(i => i.checked = i.value === characterKey);
  }
  function options(answer, max) {
    const out = new Set([answer]);
    while (out.size < 3) { const n = answer + [-3, -2, -1, 1, 2, 3][rnd(0, 5)]; if (n >= 0 && n <= max) out.add(n); }
    return [...out].sort(() => Math.random() - .5);
  }
  function makeQuestion() {
    const max = sIndex() === 0 ? Math.min(10, d().max) : d().max;
    const op = stage().op === 'mix' ? (Math.random() < .5 ? '+' : '-') : stage().op;
    const a = op === '+' ? rnd(1, max - 1) : rnd(2, max);
    const b = op === '+' ? rnd(1, max - a) : rnd(1, a);
    const text = `${a}${op}${b}`; if (text === lastEquation) return makeQuestion(); lastEquation = text;
    const answer = op === '+' ? a + b : a - b; return { a, b, op, answer, answers: options(answer, max) };
  }
  function update() {
    el.player.textContent = playerName || '-'; el.stage.textContent = `${sIndex() + 1} / 3`; el.question.textContent = `${Math.max(0, d().count - index)} もん`; el.score.textContent = score; el.time.textContent = fmt(elapsed);
    el.streak.textContent = `${streak} れんぞく`; el.stageName.textContent = stage().name; el.clog.replaceChildren();
    for (let i = 0; i < stage().maxClog; i += 1) { const dot = document.createElement('span'); dot.className = i < clog ? 'clogged' : 'clear'; el.clog.append(dot); }
  }
  function beep(hz, delay = 0) {
    if (!soundOn) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + delay; o.frequency.value = hz; g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.09, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .15); o.connect(g).connect(audio.destination); o.start(t); o.stop(t + .17); } catch { /* Optional audio. */ }
  }
  function feedback(text, type) { el.feedback.textContent = text; el.feedback.className = `math-feedback show ${type}`; }
  function clearFeedback() { el.feedback.className = 'math-feedback'; }
  function resolve(ok, valve = -1, timeout = false) {
    if (!running || resolveAt) return;
    if (ok) {
      const speed = Math.max(0, Math.round((1 - (pipeY - 112) / 240) * 70)); streak += 1; bestStreak = Math.max(bestStreak, streak); let points = 100 + speed + Math.min(50, (streak - 1) * 8);
      if (streak % 3 === 0 && clog > 0) { clog--; points += 50; el.tip.textContent = 'スーパーすっぽん！ つまりを 1こ なおした！'; feedback('スーパーすっぽん！', 'correct'); } else { el.tip.textContent = `せいかい！ +${points}てん`; feedback('せいかい！', 'correct'); }
      score += points; right = valve; beep(523); beep(784, .11);
    } else {
      clog++; streak = 0; wrong = valve; el.tip.textContent = `こたえは ${question.answer}。つまりが 1こ ふえた！`; feedback(timeout ? 'まにあわない！ つまり＋1' : `おしい！ こたえは ${question.answer}`, 'wrong'); beep(170);
    }
    resolveAt = performance.now() + 850; update();
  }
  function next() {
    resolveAt = 0; right = wrong = -1; clearFeedback();
    if (clog >= stage().maxClog) return finish(false);
    index++;
    if (index >= d().count) return finish(true);
    question = makeQuestion(); pipeY = 112; el.tip.textContent = index % (d().count / 3) === 0 ? `${stage().name}。パイプが もっと 速くなる！` : '問題が そこに とどくまえに バルブを ひらこう！'; update();
  }
  function finish(cleared) {
    running = false; elapsed = performance.now() - startAt; update(); el.finalPlayer.textContent = playerName; el.finalScore.textContent = `${score}てん`; el.finalTime.textContent = fmt(elapsed);
    if (cleared) {
      const all = records(), entry = { name: playerName, level: difficultyKey, score, time: Math.floor(elapsed), date: Date.now() }; all.push(entry);
      const saved = Object.keys(DIFF).flatMap(level => all.filter(r => r.level === level).sort((a, b) => b.score - a.score || a.time - b.time).slice(0, 20)); localStorage.setItem(STORE, JSON.stringify(saved)); renderRank();
      const rank = saved.filter(r => r.level === difficultyKey).sort((a, b) => b.score - a.score || a.time - b.time).findIndex(r => r.date === entry.date) + 1;
      el.resultEyebrow.textContent = 'だいせいこう！'; el.resultTitle.textContent = 'パイプを まもった！'; el.detail.textContent = `${d().count}もん かいけつ・さいこう ${bestStreak}れんぞく`; el.record.textContent = rank <= 7 ? `ランキング ${rank}い！ おめでとう！` : 'さいごまで よく がんばりました！'; beep(784);
    } else { el.resultEyebrow.textContent = 'パイプが ピンチ！'; el.resultTitle.textContent = 'あふれちゃった！'; el.detail.textContent = `${index}もん かいけつ・さいこう ${bestStreak}れんぞく`; el.record.textContent = 'もう一度、そうたと パイプを まもろう！'; }
    setTimeout(() => el.result.classList.add('visible'), 650);
  }
  function startGame() {
    const name = el.input.value.trim(); if (!name) { el.input.focus(); el.input.classList.add('needs-value'); return; }
    playerName = name.slice(0, 12); localStorage.setItem('cho-family-merge-last-player', playerName); setDiff(document.querySelector('input[name="mathDifficulty"]:checked')?.value || 'normal'); setCharacter(document.querySelector('input[name="mathCharacter"]:checked')?.value || 'son');
    index = score = streak = bestStreak = clog = 0; lastEquation = ''; question = makeQuestion(); pipeY = 112; elapsed = 0; startAt = performance.now(); resolveAt = 0; running = true;
    el.start.classList.remove('visible'); el.result.classList.remove('visible'); el.tip.textContent = 'れんしゅうパイプ。まずは ゆっくり いこう！'; clearFeedback(); update(); beep(440);
  }
  function openStart() { running = false; resolveAt = 0; el.result.classList.remove('visible'); el.start.classList.add('visible'); const saved = localStorage.getItem('cho-family-merge-last-player') || ''; el.input.value = saved; document.querySelectorAll('[data-math-name]').forEach(b => b.classList.toggle('selected', b.dataset.mathName === saved)); }
  function drawSota(now) {
    const y = 301 + Math.sin(now / 150) * 3; ctx.save(); ctx.translate(118, y); ctx.fillStyle = '#25243d'; rr(-45, 10, 90, 112, 24); ctx.fill(); ctx.fillStyle = '#f6bf92'; ctx.beginPath(); ctx.arc(0, -20, 44, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#392923'; ctx.beginPath(); ctx.arc(0, -53, 48, Math.PI, 0); ctx.lineTo(48, -22); ctx.quadraticCurveTo(0, -6, -48, -22); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f2cb4a'; rr(-54, -60, 108, 17, 8); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-15, -17, 11, 0, 7); ctx.arc(17, -17, 11, 0, 7); ctx.fill(); ctx.fillStyle = '#1b2740'; ctx.beginPath(); ctx.arc(-14, -16, 4, 0, 7); ctx.arc(18, -16, 4, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffdd65'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(57, 21, 24, 0, 7); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 18px sans-serif'; ctx.fillText('そうた', 0, 151); ctx.restore();
  }
  function draw() {
    const now = performance.now(), st = stage(); const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0c2038'); bg.addColorStop(1, '#071427'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 0; x < W; x += 72) for (let y = 0; y < H; y += 58) ctx.fillRect(x + 2, y + 2, 68, 54);
    ctx.strokeStyle = '#17394c'; ctx.lineWidth = 186; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(480, -25); ctx.lineTo(480, 363); ctx.quadraticCurveTo(480, 394, 511, 394); ctx.lineTo(716, 394); ctx.stroke(); ctx.strokeStyle = st.color; ctx.lineWidth = 150; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '900 22px sans-serif'; ctx.fillText(`STAGE ${sIndex() + 1}　${st.name}`, 28, 42); ctx.fillStyle = '#ccefff'; ctx.font = '800 17px sans-serif'; ctx.fillText(`パイプ速度　${seconds().toFixed(1)}びょう`, 28, 68); drawSota(now);
    if (!question) return;
    ctx.save(); ctx.translate(480, pipeY); ctx.fillStyle = '#7a431f'; ctx.beginPath(); ctx.arc(0, 0, 57, 0, 7); ctx.fill(); ctx.strokeStyle = '#4b2818'; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '950 29px sans-serif'; ctx.fillText(`${question.a}${question.op === '+' ? '＋' : '−'}${question.b}`, 0, 15); ctx.restore();
    question.answers.forEach((answer, i) => { const r = valves[i], bad = wrong === i, good = right === i; ctx.fillStyle = bad ? '#77445c' : good ? '#49bc65' : '#203c59'; rr(r.x, r.y, r.w, r.h, 21); ctx.fill(); ctx.strokeStyle = bad ? '#ff9db9' : '#9be2ff'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#e9f8ff'; ctx.beginPath(); ctx.arc(r.x + 45, r.y + 45, 26, 0, 7); ctx.fill(); ctx.strokeStyle = '#e8506e'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(r.x + 27, r.y + 27); ctx.lineTo(r.x + 63, r.y + 63); ctx.moveTo(r.x + 63, r.y + 27); ctx.lineTo(r.x + 27, r.y + 63); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '950 42px sans-serif'; ctx.fillText(answer, r.x + 138, r.y + 51); ctx.fillStyle = '#c5e1f0'; ctx.font = '800 14px sans-serif'; ctx.fillText(`${i + 1}ばん バルブ`, r.x + 138, r.y + 76); });
  }
  function frame(now) { const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now; if (visible) { if (running) { elapsed = now - startAt; el.time.textContent = fmt(elapsed); if (resolveAt && now >= resolveAt) next(); else if (!resolveAt) { pipeY += 240 / seconds() * dt; if (pipeY >= 352) resolve(false, -1, true); } } draw(); } requestAnimationFrame(frame); }
  function pick(event) { const r = canvas.getBoundingClientRect(), x = (event.clientX - r.left) * W / r.width, y = (event.clientY - r.top) * H / r.height; const i = valves.findIndex(v => x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h); if (i >= 0) resolve(question.answers[i] === question.answer, i); }
  canvas.addEventListener('pointerdown', pick); window.addEventListener('keydown', e => { if (visible && running && !resolveAt && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); const i = Number(e.key) - 1; resolve(question.answers[i] === question.answer, i); } });
  document.querySelectorAll('[data-math-name]').forEach(b => b.addEventListener('click', () => { el.input.value = b.dataset.mathName; document.querySelectorAll('[data-math-name]').forEach(x => x.classList.toggle('selected', x === b)); const key = Object.keys(CHARACTERS).find(k => CHARACTERS[k] === b.dataset.mathName); if (key) setCharacter(key, false); }));
  el.startButton.addEventListener('click', startGame); el.retry.addEventListener('click', startGame); el.change.addEventListener('click', openStart); el.newGame.addEventListener('click', openStart); el.input.addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });
  el.sound.addEventListener('click', () => { soundOn = !soundOn; el.sound.textContent = soundOn ? '♪' : '×'; }); el.clear.addEventListener('click', () => { if (confirm(`${d().label}のランキングを消しますか？`)) { localStorage.setItem(STORE, JSON.stringify(records().filter(r => r.level !== difficultyKey))); renderRank(); } });
  document.querySelectorAll('input[name="mathDifficulty"]').forEach(i => i.addEventListener('change', () => setDiff(i.value, false))); document.querySelectorAll('input[name="mathCharacter"]').forEach(i => i.addEventListener('change', () => setCharacter(i.value, false)));
  function open() { visible = true; setDiff(localStorage.getItem('cho-family-pipe-sota-level') || 'normal', false); setCharacter(localStorage.getItem('cho-family-pipe-sota-character') || 'son', false); if (!running) openStart(); }
  function leave() { visible = running = false; resolveAt = 0; el.start.classList.remove('visible'); el.result.classList.remove('visible'); }
  setDiff(localStorage.getItem('cho-family-pipe-sota-level') || 'normal', false); setCharacter(localStorage.getItem('cho-family-pipe-sota-character') || 'son', false); requestAnimationFrame(frame); window.PoopMathGame = { open, leave };
})();
