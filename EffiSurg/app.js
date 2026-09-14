(() => {
  'use strict';
  const mediaVersion = 'video-00d590ebf0db';
  const tasks = {
    'phantom-handoff': { label: 'Needle handoff on phantom tissue', ours: 20, baseline: 18 },
    'phantom-knot': { label: 'Knot tying on phantom tissue', ours: 20, baseline: 17 },
    'exvivo-handoff': { label: 'Needle handoff on ex vivo tissue', ours: 19, baseline: 15 },
    'exvivo-knot': { label: 'Knot tying on ex vivo tissue', ours: 18, baseline: 14 }
  };
  const views = { microscope: 'Microscope view', left: 'Left wrist view', right: 'Right wrist view' };
  const players = { ours: document.querySelector('#ours-video'), baseline: document.querySelector('#baseline-video') };
  const playButton = document.querySelector('#play-both');
  const status = document.querySelector('#demo-status');
  const rate = document.querySelector('#playback-rate');
  let task = 'phantom-handoff', view = 'microscope', generation = 0;

  function updatePlayButton() {
    const playing = Object.values(players).some(video => !video.paused && !video.ended);
    playButton.textContent = playing ? 'Ⅱ Pause both' : '▶ Play both';
  }
  function updateVideos(preserveTime = false) {
    generation++;
    for (const [method, video] of Object.entries(players)) {
      const previousTime = preserveTime ? video.currentTime : 0;
      video.pause();
      const name = `${task}-${method}-${view}`;
      video.poster = `assets/posters/${name}.jpg?v=${mediaVersion}`;
      video.src = `assets/video/${name}.mp4?v=${mediaVersion}`;
      video.setAttribute('aria-label', `${method === 'ours' ? 'EffiSurg' : 'Transformer Flow Policy'}: ${tasks[task].label}, ${views[view]}`);
      video.onloadedmetadata = () => {
        video.playbackRate = Number(rate.value);
        if (previousTime && Number.isFinite(video.duration)) video.currentTime = Math.min(previousTime, Math.max(0, video.duration - .1));
      };
      video.load();
      document.querySelector(`#${method}-success`).textContent = `${tasks[task][method]}/20 successful trials`;
    }
    document.querySelectorAll('[data-task]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.task === task)));
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    document.querySelectorAll('.camera-label').forEach(label => { label.textContent = views[view]; });
    status.textContent = `${tasks[task].label} · ${views[view]}`;
    updatePlayButton();
  }
  document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click', () => {
    if (task === button.dataset.task) return;
    task = button.dataset.task;
    updateVideos();
  }));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    if (view === button.dataset.view) return;
    view = button.dataset.view;
    updateVideos(true);
  }));
  playButton.addEventListener('click', async () => {
    const videos = Object.values(players);
    if (videos.some(video => !video.paused && !video.ended)) {
      videos.forEach(video => video.pause());
      return;
    }
    const current = generation;
    if (videos.some(video => video.ended)) videos.forEach(video => { video.currentTime = 0; });
    const outcomes = await Promise.allSettled(videos.map(video => video.play()));
    if (current !== generation) return;
    if (outcomes.some(result => result.status === 'rejected')) status.textContent = 'Playback could not start. Please use the play control on each video to retry.';
    updatePlayButton();
  });
  document.querySelector('#restart-both').addEventListener('click', () => {
    Object.values(players).forEach(video => { video.pause(); video.currentTime = 0; });
    status.textContent = `${tasks[task].label} · ${views[view]} · Both videos reset`;
  });
  rate.addEventListener('change', () => Object.values(players).forEach(video => { video.playbackRate = Number(rate.value); }));
  Object.values(players).forEach(video => {
    ['play', 'pause', 'ended'].forEach(event => video.addEventListener(event, updatePlayButton));
    video.addEventListener('error', () => { status.textContent = 'This video could not be loaded. Check your connection and select the task again or reload the page.'; });
  });
  updateVideos();

  const hero = document.querySelector('.hero-video');
  const heroToggle = document.querySelector('#hero-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let heroUserPaused = reducedMotion.matches || Boolean(navigator.connection?.saveData);
  function loadHero() { if (!hero.getAttribute('src')) hero.src = `assets/video/hero.mp4?v=${mediaVersion}`; }
  function playHero() { loadHero(); hero.play().catch(() => {}); }
  heroToggle.addEventListener('click', () => {
    heroUserPaused = !hero.paused;
    if (hero.paused) playHero(); else hero.pause();
  });
  ['play', 'pause'].forEach(event => hero.addEventListener(event, () => {
    heroToggle.textContent = hero.paused ? '▶' : 'Ⅱ';
    heroToggle.setAttribute('aria-label', hero.paused ? 'Play background video' : 'Pause background video');
  }));
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !heroUserPaused && !document.hidden) playHero(); else hero.pause();
  }, { threshold: .1 }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hero.pause(); Object.values(players).forEach(video => video.pause());
    } else if (!heroUserPaused && document.querySelector('.hero').getBoundingClientRect().bottom > 0) playHero();
  });
  reducedMotion.addEventListener('change', event => { if (event.matches) { heroUserPaused = true; hero.pause(); } });
  const sectionLinks = [...document.querySelectorAll('.outline nav a')];
  const sections = sectionLinks.map(link => document.querySelector(link.getAttribute('href')));
  let scheduled = false;
  function highlightSection() {
    let current = sections[0];
    for (const section of sections) if (section.getBoundingClientRect().top <= window.innerHeight * .35) current = section;
    sectionLinks.forEach(link => {
      const active = link.getAttribute('href') === `#${current.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    scheduled = false;
  }
  window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(highlightSection); } }, { passive: true });
  highlightSection();
})();
