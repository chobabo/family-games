(() => {
  'use strict';

  const selectModal = document.getElementById('gameSelectModal');
  const suikaApp = document.getElementById('suikaApp');
  const dashApp = document.getElementById('dashApp');
  const mathApp = document.getElementById('mathApp');
  const battleApp = document.getElementById('battleApp');
  const blockApp = document.getElementById('blockApp');
  const chooseSuika = document.getElementById('chooseSuikaButton');
  const chooseDash = document.getElementById('chooseDashButton');
  const chooseMath = document.getElementById('chooseMathButton');
  const chooseBattle = document.getElementById('chooseBattleButton');
  const chooseBlock = document.getElementById('chooseBlockButton');

  function hideApps() {
    suikaApp.hidden = true;
    dashApp.hidden = true;
    mathApp.hidden = true;
    battleApp.hidden = true;
    blockApp.hidden = true;
  }

  function openSelector() {
    window.FamilySuikaGame?.leave();
    window.FamilyDashGame?.leave();
    window.PoopMathGame?.leave();
    window.FamilyBubbleBattle?.leave();
    window.FamilyBlockPuzzle?.leave();
    hideApps();
    selectModal.classList.add('visible');
  }

  chooseSuika.addEventListener('click', () => {
    selectModal.classList.remove('visible');
    dashApp.hidden = true;
    suikaApp.hidden = false;
    window.FamilySuikaGame?.open();
  });

  chooseDash.addEventListener('click', () => {
    selectModal.classList.remove('visible');
    suikaApp.hidden = true;
    dashApp.hidden = false;
    window.FamilyDashGame?.open();
  });

  chooseMath.addEventListener('click', () => {
    selectModal.classList.remove('visible');
    suikaApp.hidden = true;
    dashApp.hidden = true;
    mathApp.hidden = false;
    window.PoopMathGame?.open();
  });

  chooseBattle.addEventListener('click', () => {
    selectModal.classList.remove('visible');
    suikaApp.hidden = true;
    dashApp.hidden = true;
    mathApp.hidden = true;
    battleApp.hidden = false;
    window.FamilyBubbleBattle?.open();
  });

  chooseBlock.addEventListener('click', () => {
    selectModal.classList.remove('visible');
    suikaApp.hidden = dashApp.hidden = mathApp.hidden = battleApp.hidden = true;
    blockApp.hidden = false;
    window.FamilyBlockPuzzle?.open();
  });

  document.querySelectorAll('.game-menu-button').forEach(button => {
    button.addEventListener('click', openSelector);
  });

  hideApps();
  selectModal.classList.add('visible');
})();
