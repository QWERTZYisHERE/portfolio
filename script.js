// Hold the page's initial fade-in (see the body/header CSS) until the
// essentials are actually ready — window "load" (fonts, eager images) plus
// the first video's metadata, if there is one — instead of revealing on a
// fixed-length timer that can finish before the media has. Capped at 4s so
// a slow network or a resource that never fires never leaves the page stuck
// invisible.
(function revealWhenReady() {
  const root = document.documentElement;
  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    root.classList.add('is-loaded');
  }

  try {
    const waiters = [
      new Promise(resolve => {
        if (document.readyState === 'complete') resolve();
        else window.addEventListener('load', resolve, { once: true });
      })
    ];

    const firstVideo = document.querySelector('video');
    if (firstVideo) {
      waiters.push(new Promise(resolve => {
        if (firstVideo.readyState >= 1) resolve(); // HAVE_METADATA
        else firstVideo.addEventListener('loadedmetadata', resolve, { once: true });
      }));
    }

    Promise.all(waiters).then(reveal);
  } catch (e) {
    reveal();
  }

  setTimeout(reveal, 4000);
})();

// Safari is much stricter than Chromium about a video being "ready enough"
// to play: a play() call issued right as a video enters the viewport often
// gets rejected there (even though it succeeds a moment later), and since
// every play() below is wrapped in .catch(() => {}) to avoid unhandled
// rejections, that failure otherwise just silently leaves the video stuck on
// its poster/black frame. This retries once the video actually reports
// enough data to play, instead of only trying the single initial call.
function playWhenReady(video) {
  const attempt = video.play();
  if (attempt && typeof attempt.catch === 'function') {
    attempt.catch(() => {
      video.addEventListener('canplay', () => {
        video.play().catch(() => {});
      }, { once: true });
    });
  }
}

// Reveal each project as it scrolls into view (fade + rise). Runs first and
// defensively, so a later error in this file can't strand sections at the
// CSS's default opacity:0 — and if the browser lacks IntersectionObserver,
// everything is revealed immediately instead of staying invisible.
try {
  const sections = document.querySelectorAll('.project-layout');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    sections.forEach(section => revealObserver.observe(section));
  } else {
    sections.forEach(section => section.classList.add('is-visible'));
  }
} catch (e) {
  document.querySelectorAll('.project-layout').forEach(section => section.classList.add('is-visible'));
}

// Initialize every slideshow independently
document.querySelectorAll('.slideshow-container').forEach(container => {
  const rail   = container.querySelector('.slides-rail');
  if (!rail) return;
  const slides = rail.querySelectorAll('.mySlides');
  const total  = slides.length;
  if (total === 0) return; // e.g. the About page's single plain <img>, nothing to swipe/play
  const dotsEl = container.querySelector('.dots');
  let   idx    = 0;
  let   startX = null;
  let   isNearViewport = false;

  // Only the active slide's video should ever be actually playing — the
  // others stay paused (preload="metadata" keeps them cheap) until the user
  // swipes to them.
  function syncVideos() {
    slides.forEach((slide, i) => {
      const video = slide.querySelector('video');
      if (!video) return;
      if (i === idx && isNearViewport) {
        if (video.paused) playWhenReady(video);
      } else {
        video.pause();
      }
    });
  }

  // Build dots dynamically
  if (dotsEl) {
    slides.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      d.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(d);
    });
  }

  function goTo(n) {
    idx = (n + total) % total;
    rail.style.transform = `translateX(-${idx * 100}%)`;
    if (dotsEl) {
      dotsEl.querySelectorAll('.dot').forEach((d, i) =>
        d.classList.toggle('active', i === idx)
      );
    }
    syncVideos();
  }

  const prevBtn = container.querySelector('.prev');
  const nextBtn = container.querySelector('.next');
  if (prevBtn) prevBtn.addEventListener('click', () => goTo(idx - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(idx + 1));

  // Touch / drag swipe. A tap (as opposed to a swipe) also acts as a manual
  // play button: some mobile browsers (iOS in particular, depending on Low
  // Power Mode or its Settings > Safari > Auto-Play setting) refuse
  // programmatic autoplay outright no matter how "ready" the video is — but
  // every browser always allows play() from a direct tap/click, so this is
  // the fallback that guarantees the video is reachable on any phone.
  rail.addEventListener('pointerdown', e => { startX = e.clientX; rail.setPointerCapture(e.pointerId); });
  rail.addEventListener('pointerup',   e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) {
      goTo(dx < 0 ? idx + 1 : idx - 1);
    } else {
      const video = slides[idx].querySelector('video');
      if (video && video.paused) video.play().catch(() => {});
    }
    startX = null;
  });

  // Only fetch/play video once the slideshow scrolls near the viewport
  // (with a little runway so it's ready by the time it's actually visible),
  // and pause again once it scrolls away to free up bandwidth/CPU for
  // whatever the visitor is looking at now.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      isNearViewport = entry.isIntersecting;
      syncVideos();
    });
  }, { rootMargin: '300px 0px' });
  observer.observe(container);
});

// Same lazy-load/lazy-play treatment for standalone videos that aren't
// part of a slideshow (e.g. the grid on the Digital Playthings page).
document.querySelectorAll('video').forEach(video => {
  if (video.closest('.mySlides')) return; // already handled above

  // Tap-to-play fallback — see the note above the slideshow's pointerup
  // handler for why this matters on mobile.
  video.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => {});
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        playWhenReady(video);
      } else {
        video.pause();
      }
    });
  }, { rootMargin: '300px 0px' });
  observer.observe(video);
});

// Keyboard support — left/right arrows control whichever slideshow was
// most recently hovered or interacted with (falls back to the first one).
let activeSlideshow = document.querySelector('.slideshow-container');
document.querySelectorAll('.slideshow-container').forEach(c => {
  c.addEventListener('pointerenter', () => { activeSlideshow = c; });
});
document.addEventListener('keydown', e => {
  if (!activeSlideshow) return;
  if (e.key === 'ArrowLeft')  activeSlideshow.querySelector('.prev')?.click();
  if (e.key === 'ArrowRight') activeSlideshow.querySelector('.next')?.click();
});
