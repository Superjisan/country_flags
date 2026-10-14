let viewMode = 'play';

export function getViewMode() {
  return viewMode;
}

export function setViewMode(mode) {
  viewMode = mode;
}

export function isStudyMode() {
  return viewMode === 'study';
}

export function isRateMode() {
  return viewMode === 'rate';
}

export function syncModeToggleButtons() {
  document.getElementById('play-mode')?.classList.toggle('active', viewMode === 'play');
  document.getElementById('study-mode')?.classList.toggle('active', viewMode === 'study');
  document.getElementById('rate-mode')?.classList.toggle('active', viewMode === 'rate');
}
