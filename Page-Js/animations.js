document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cloudEl = document.getElementById('anim-cloud');
  const frontendEl = document.getElementById('anim-frontend');
  const backendEl = document.getElementById('anim-backend');

  if (!cloudEl || !frontendEl || !backendEl) return;

  const cloudWords = ['Cloud Engineering', 'DevOps Engineering', 'System Administration', 'SRE Engineer'];
  const frontendWords = ['Frontend Engineering', 'Backend', 'Basic Programming', 'WordPress Development'];
  const backendWords = ['Backend Engineering', 'Python', 'Scripting'];

  const state = { cloud: 0, frontend: 0, backend: 0 };

  function updateText(el, words, key) {
    if (!el) return;

    if (reduceMotion) {
      el.textContent = words[state[key]];
      return;
    }

    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';

    setTimeout(() => {
      state[key] = (state[key] + 1) % words.length;
      el.textContent = words[state[key]];
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 220);
  }

  if (reduceMotion) {
    cloudEl.textContent = cloudWords[0];
    frontendEl.textContent = frontendWords[0];
    backendEl.textContent = backendWords[0];
    return;
  }

  const intervalId = window.setInterval(() => {
    updateText(cloudEl, cloudWords, 'cloud');
    setTimeout(() => updateText(frontendEl, frontendWords, 'frontend'), 180);
    setTimeout(() => updateText(backendEl, backendWords, 'backend'), 360);
  }, 3200);

  // Keep the rotation simple and easy to maintain for junior developers.
  window.addEventListener('beforeunload', () => window.clearInterval(intervalId), { once: true });
});
