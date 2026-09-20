(() => {
  'use strict';

  const selectModal = document.getElementById('gameSelectModal');
  const suikaApp = document.getElementById('suikaApp');
  const dashApp = document.getElementById('dashApp');
  const chooseSuika = document.getElementById('chooseSuikaButton');
  const chooseDash = document.getElementById('chooseDashButton');

  function hideApps() {
    suikaApp.hidden = true;
    dashApp.hidden = true;
  }

  function openSelector() {
    window.FamilySuikaGame?.leave();
    window.FamilyDashGame?.leave();
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

  document.querySelectorAll('.game-menu-button').forEach(button => {
    button.addEventListener('click', openSelector);
  });

  hideApps();
  selectModal.classList.add('visible');
})();
