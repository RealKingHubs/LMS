document.addEventListener("DOMContentLoaded", () => {
  const cloudEl = document.getElementById("anim-cloud");
  const frontendEl = document.getElementById("anim-frontend");
  const backendEl = document.getElementById("anim-backend");

  const cloudWords = ["Cloud Engineering", "DevOps Engineering", "System Administration", "SRE Engineer"];
  const frontendWords = ["Frontend Engineering", "Backend", "Basic Programing", "Wordpress Developement"];
  const backendWords = ["Backend Engineering", "Python", "Scripting"];

  let cloudIdx = 0;
  let frontendIdx = 0;
  let backendIdx = 0;

  function updateText(el, words, idxObj, key) {
    if (!el) return;
    
    // Fade out
    el.style.opacity = "0";
    el.style.transform = "translateY(4px)";
    
    setTimeout(() => {
      // Update text and increment index
      idxObj[key] = (idxObj[key] + 1) % words.length;
      el.textContent = words[idxObj[key]];
      
      // Fade in
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, 400); // Wait for fade out to complete
  }

  const state = {
    cloud: cloudIdx,
    frontend: frontendIdx,
    backend: backendIdx
  };

  setInterval(() => {
    updateText(cloudEl, cloudWords, state, 'cloud');
    setTimeout(() => updateText(frontendEl, frontendWords, state, 'frontend'), 300);
    setTimeout(() => updateText(backendEl, backendWords, state, 'backend'), 600);
  }, 3000);
});
