// Initialize every slideshow independently
document.querySelectorAll('.slideshow-container').forEach(container => {
  const rail   = container.querySelector('.slides-rail');
  const slides = rail.querySelectorAll('.mySlides');
  const total  = slides.length;
  const dotsEl = container.querySelector('.dots');
  let   idx    = 0;
  let   startX = null;

  // Build dots dynamically
  slides.forEach((_, i) => {
    const d = document.createElement('span');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(d);
  });

  function goTo(n) {
    idx = (n + total) % total;
    rail.style.transform = `translateX(-${idx * 100}%)`;
    dotsEl.querySelectorAll('.dot').forEach((d, i) =>
      d.classList.toggle('active', i === idx)
    );
  }

  container.querySelector('.prev').addEventListener('click', () => goTo(idx - 1));
  container.querySelector('.next').addEventListener('click', () => goTo(idx + 1));

  // Touch / drag swipe
  rail.addEventListener('pointerdown', e => { startX = e.clientX; rail.setPointerCapture(e.pointerId); });
  rail.addEventListener('pointerup',   e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? idx + 1 : idx - 1);
    startX = null;
  });
});

// Keyboard support — controls whichever slideshow is focused/hovered
// (simple fallback: controls the first slideshow)
document.addEventListener('keydown', e => {
  const first = document.querySelector('.slideshow-container');
  if (!first) return;
  if (e.key === 'ArrowLeft')  first.querySelector('.prev').click();
  if (e.key === 'ArrowRight') first.querySelector('.next').click();
});