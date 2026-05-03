// SJC Website - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {

  // ===== AOS init =====
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      once: true,
      offset: 80,
      easing: 'ease-out-cubic'
    });
  }

  // ===== Hero Swiper =====
  const heroEl = document.querySelector('.hero-swiper');
  if (heroEl && typeof Swiper !== 'undefined') {

    // Force mobile hero styles via JS to overcome any CSS conflicts
    function applyHeroMobileStyles() {
      // No-op — the CSS now handles mobile sizing. Kept for backwards compat.
    }

    // Save original bg styles before mobile override
    document.querySelectorAll('.hero-bg-v3, .hero-bg').forEach(bg => {
      bg.setAttribute('data-original-style', bg.getAttribute('style') || '');
    });

    applyHeroMobileStyles();
    window.addEventListener('resize', applyHeroMobileStyles);

    const AUTOPLAY_DELAY = 6000;
    const heroSwiper = new Swiper('.hero-swiper', {
      loop: true,
      slidesPerView: 1,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: 1000,
      observer: true,
      observeParents: true,
      autoplay: {
        delay: AUTOPLAY_DELAY,
        disableOnInteraction: false
      },
      pagination: {
        el: '.hero-pagination',
        clickable: true
      },
      navigation: {
        nextEl: '.hero-next, .hero-next-v2, .hero-scg-next, .hero-next-v3',
        prevEl: '.hero-prev, .hero-prev-v2, .hero-scg-prev, .hero-prev-v3'
      },
      on: {
        slideChange: function () {
          // Update v2 indicator counter
          const current = document.querySelector('.indicator-current');
          if (current) {
            current.textContent = String(this.realIndex + 1).padStart(2, '0');
          }
          // Update v3 (SCG) counter
          const scgCurrent = document.querySelector('.hero-scg-current');
          if (scgCurrent) {
            scgCurrent.textContent = String(this.realIndex + 1).padStart(2, '0');
          }
          // Update v3 hero counter
          const heroCurrent = document.querySelector('.hero-current');
          if (heroCurrent) {
            heroCurrent.textContent = String(this.realIndex + 1).padStart(2, '0');
          }
          // Reset progress bar (v2)
          const bar = document.querySelector('.progress-bar');
          if (bar) {
            bar.style.transition = 'none';
            bar.style.width = '0%';
            void bar.offsetWidth;
            bar.style.transition = `width ${AUTOPLAY_DELAY}ms linear`;
            bar.style.width = '100%';
          }
          // Reset progress bar (v3 / SCG)
          const scgBar = document.querySelector('.hero-scg-progress-bar');
          if (scgBar) {
            scgBar.style.transition = 'none';
            scgBar.style.width = '0%';
            void scgBar.offsetWidth;
            scgBar.style.transition = `width ${AUTOPLAY_DELAY}ms linear`;
            scgBar.style.width = '100%';
          }
          // Reset progress bar (v3 hero)
          const heroBar = document.querySelector('.hero-progress-bar');
          if (heroBar) {
            heroBar.style.transition = 'none';
            heroBar.style.width = '0%';
            void heroBar.offsetWidth;
            heroBar.style.transition = `width ${AUTOPLAY_DELAY}ms linear`;
            heroBar.style.width = '100%';
          }
        },
        init: function () {
          const bar = document.querySelector('.progress-bar');
          if (bar) {
            bar.style.transition = `width ${AUTOPLAY_DELAY}ms linear`;
            bar.style.width = '100%';
          }
          const scgBar = document.querySelector('.hero-scg-progress-bar');
          if (scgBar) {
            scgBar.style.transition = `width ${AUTOPLAY_DELAY}ms linear`;
            scgBar.style.width = '100%';
          }
          const heroBar = document.querySelector('.hero-progress-bar');
          if (heroBar) {
            heroBar.style.transition = `width ${AUTOPLAY_DELAY}ms linear`;
            heroBar.style.width = '100%';
          }
          // Set initial counter
          const scgCurrent = document.querySelector('.hero-scg-current');
          if (scgCurrent) scgCurrent.textContent = '01';
          const heroCurrent = document.querySelector('.hero-current');
          if (heroCurrent) heroCurrent.textContent = '01';
        }
      }
    });

    // Re-apply mobile styles after swiper is initialized
    setTimeout(applyHeroMobileStyles, 100);
    setTimeout(applyHeroMobileStyles, 500);
  }

  // ===== Business Scroller =====
  const bizScroller = document.getElementById('bizScroller');
  if (bizScroller) {
    const cards = bizScroller.querySelectorAll('.biz-scroll-card');
    const prev = document.getElementById('bizPrev');
    const next = document.getElementById('bizNext');
    const counterEl = document.getElementById('bizCurrent');
    const progressBar = document.getElementById('bizProgressBar');
    const totalCards = cards.length;

    function updateScrollerState() {
      const scrollLeft = bizScroller.scrollLeft;
      const cardWidth = cards[0].offsetWidth + 4; // +gap
      const visibleCount = Math.max(1, Math.floor(bizScroller.offsetWidth / cardWidth));
      const currentIdx = Math.round(scrollLeft / cardWidth);
      const displayIdx = Math.min(currentIdx + 1, totalCards);
      if (counterEl) counterEl.textContent = String(displayIdx).padStart(2, '0');

      if (progressBar) {
        const maxScroll = bizScroller.scrollWidth - bizScroller.clientWidth;
        const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
        // Min width so the bar is always visible
        const minWidth = (visibleCount / totalCards) * 100;
        progressBar.style.width = Math.max(minWidth, progress) + '%';
      }

      // Highlight active card with red bottom border
      cards.forEach(c => c.classList.remove('is-active'));
      if (cards[currentIdx]) cards[currentIdx].classList.add('is-active');
    }

    function scrollByCard(direction) {
      const cardWidth = cards[0].offsetWidth + 4;
      bizScroller.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    }

    if (prev) prev.addEventListener('click', () => scrollByCard(-1));
    if (next) next.addEventListener('click', () => scrollByCard(1));
    bizScroller.addEventListener('scroll', updateScrollerState);

    // Initial state
    updateScrollerState();
    if (cards[0]) cards[0].classList.add('is-active');
  }

  // ===== News Swiper =====
  const newsEl = document.querySelector('.news-swiper');
  if (newsEl && typeof Swiper !== 'undefined') {
    new Swiper('.news-swiper', {
      slidesPerView: 1,
      spaceBetween: 24,
      pagination: {
        el: '.news-pagination',
        clickable: true
      },
      breakpoints: {
        640: { slidesPerView: 2 },
        992: { slidesPerView: 3 }
      }
    });
  }

  // ===== What We Do horizontal scroller =====
  const wwdTrack = document.getElementById('wwdTrack');
  if (wwdTrack) {
    const prevBtn = document.querySelector('.wwd-prev');
    const nextBtn = document.querySelector('.wwd-next');
    const counter = document.querySelector('.wwd-current');
    const activeNameEl = document.getElementById('wwdActiveName');
    const progressFill = document.getElementById('wwdProgressFill');
    const tiles = wwdTrack.querySelectorAll('.wwd35-card, .wwd34-tile, .wwd-tile');

    function getScrollAmount() {
      const tile = tiles[0];
      if (!tile) return 256;
      const style = getComputedStyle(wwdTrack);
      const gap = parseInt(style.gap) || 8;
      return tile.offsetWidth + gap;
    }

    function getActiveIndex() {
      if (tiles.length === 0) return 0;
      // Find which card is closest to the start of the visible viewport
      const trackRect = wwdTrack.getBoundingClientRect();
      let bestIdx = 0;
      let bestDist = Infinity;
      tiles.forEach((tile, idx) => {
        const tileRect = tile.getBoundingClientRect();
        const dist = Math.abs(tileRect.left - trackRect.left - 4);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      return bestIdx;
    }

    function updateUI() {
      if (tiles.length === 0) return;
      const idx = getActiveIndex();

      // Update counter
      if (counter) counter.textContent = String(idx + 1).padStart(2, '0');

      // Update active card
      tiles.forEach((tile, i) => {
        tile.classList.toggle('is-active', i === idx);
      });

      // Update active name (uses card text)
      if (activeNameEl && tiles[idx]) {
        const nameEl = tiles[idx].querySelector('.wwd35-card-text, .wwd34-tile-name span:first-child, .wwd-tile-name span');
        if (nameEl) activeNameEl.textContent = nameEl.textContent.trim();
      }

      // Update progress fill
      if (progressFill && tiles.length > 1) {
        const pct = ((idx + 1) / tiles.length) * 100;
        progressFill.style.width = pct + '%';
      }

      // Update buttons
      if (prevBtn && nextBtn) {
        const maxScroll = wwdTrack.scrollWidth - wwdTrack.clientWidth;
        prevBtn.disabled = wwdTrack.scrollLeft <= 5;
        nextBtn.disabled = wwdTrack.scrollLeft >= maxScroll - 5;
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => {
      wwdTrack.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      wwdTrack.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    });

    let scrollTimeout;
    wwdTrack.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateUI, 50);
    });

    // Initial state
    updateUI();
  }

  // ===== Mobile nav toggle =====
  const navToggle = document.getElementById('navToggle');
  const navClose = document.getElementById('navClose');
  const mainNav = document.getElementById('mainNav');
  const navBackdrop = document.getElementById('navBackdrop');

  // ===== What We Do V9 paginated grid =====
  const wwd9Track = document.getElementById('wwd9Track');
  if (wwd9Track) {
    const pages = wwd9Track.querySelectorAll('.wwd9-page');
    const dots = document.querySelectorAll('#wwd9Dots .wwd9-dot');
    const prev = document.querySelector('.wwd9-prev');
    const next = document.querySelector('.wwd9-next');
    let currentPage = 0;
    const totalPages = pages.length;

    function goTo(idx) {
      idx = Math.max(0, Math.min(totalPages - 1, idx));
      currentPage = idx;
      wwd9Track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      if (prev) prev.disabled = idx === 0;
      if (next) next.disabled = idx === totalPages - 1;
    }

    if (prev) prev.addEventListener('click', () => goTo(currentPage - 1));
    if (next) next.addEventListener('click', () => goTo(currentPage + 1));
    dots.forEach(d => d.addEventListener('click', () => goTo(parseInt(d.dataset.page))));

    // Initial state
    goTo(0);
  }

  // ===== Language dropdown removed in v33 =====
  // The new system uses real <a href="?lang=xx"> links handled by the server.
  // Dropdown open/close is handled inline in views/layouts/public.ejs.
  // Do NOT add click handlers here — they would prevent navigation.

  // ===== Old wwd8 scroller (legacy, kept for safety) =====
  const wwd8Track = document.getElementById('wwd8Track');
  if (wwd8Track) {
    const cards = wwd8Track.querySelectorAll('.wwd8-card');
    const prev = document.querySelector('.wwd8-prev');
    const next = document.querySelector('.wwd8-next');
    const current = document.querySelector('.wwd8-current');
    const activeName = document.getElementById('wwd8ActiveName');
    const fill = document.getElementById('wwd8ProgressFill');

    function getCardWidth() {
      if (cards.length === 0) return 248;
      const style = getComputedStyle(wwd8Track);
      const gap = parseInt(style.gap) || 8;
      return cards[0].offsetWidth + gap;
    }

    function getActiveIndex() {
      if (cards.length === 0) return 0;
      const trackRect = wwd8Track.getBoundingClientRect();
      let bestIdx = 0;
      let bestDist = Infinity;
      cards.forEach((card, idx) => {
        const r = card.getBoundingClientRect();
        const dist = Math.abs(r.left - trackRect.left - 4);
        if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
      });
      return bestIdx;
    }

    function update() {
      const idx = getActiveIndex();
      if (current) current.textContent = String(idx + 1).padStart(2, '0');
      cards.forEach((c, i) => c.classList.toggle('is-active', i === idx));
      if (activeName && cards[idx]) {
        const t = cards[idx].querySelector('.wwd8-card-text');
        if (t) activeName.textContent = t.textContent.trim();
      }
      if (fill && cards.length > 1) {
        fill.style.width = (((idx + 1) / cards.length) * 100) + '%';
      }
      const max = wwd8Track.scrollWidth - wwd8Track.clientWidth;
      if (prev) prev.disabled = wwd8Track.scrollLeft <= 5;
      if (next) next.disabled = wwd8Track.scrollLeft >= max - 5;
    }

    if (prev) prev.addEventListener('click', () => {
      wwd8Track.scrollBy({ left: -getCardWidth(), behavior: 'smooth' });
    });
    if (next) next.addEventListener('click', () => {
      wwd8Track.scrollBy({ left: getCardWidth(), behavior: 'smooth' });
    });

    let timer;
    wwd8Track.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(update, 50);
    });

    update();
  }

  // ===== Mobile Menu =====
  // Strategy: Use transform translateX for the open/close animation
  // (hardware-accelerated, doesn't fight with other CSS).
  // Apply minimum needed inline styles via JS to bypass CSS conflicts.

  function setupMobileNav() {
    if (!mainNav) return;
    const isMobile = window.innerWidth <= 992;

    if (isMobile) {
      // Apply mobile layout inline (overrides any CSS)
      Object.assign(mainNav.style, {
        position: 'fixed',
        top: '0',
        right: '0',
        bottom: '0',
        width: '320px',
        maxWidth: '85vw',
        height: '100vh',
        background: '#ffffff',
        zIndex: '99999',
        padding: '60px 0 0 0',
        margin: '0',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        transform: mainNav.classList.contains('open') ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        pointerEvents: 'auto',
        visibility: 'visible'
      });

      // Force nav links to be clickable
      mainNav.querySelectorAll('.nav-link').forEach(link => {
        Object.assign(link.style, {
          display: 'block',
          width: '100%',
          padding: '16px 24px',
          backgroundColor: '#ffffff',
          color: '#1a2540',
          fontSize: '15px',
          fontWeight: '500',
          textDecoration: 'none',
          borderBottom: '1px solid #f0f2f5',
          cursor: 'pointer',
          pointerEvents: 'auto',
          position: 'relative',
          zIndex: '1'
        });
      });

      // Close button
      if (navClose) {
        Object.assign(navClose.style, {
          position: 'absolute',
          top: '14px',
          right: '14px',
          width: '40px',
          height: '40px',
          background: '#f5f6f8',
          border: 'none',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1a2540',
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: '100000',
          padding: '0',
          fontSize: '16px'
        });
      }

      // Backdrop
      if (navBackdrop) {
        Object.assign(navBackdrop.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.55)',
          zIndex: '99990',
          opacity: navBackdrop.classList.contains('open') ? '1' : '0',
          visibility: navBackdrop.classList.contains('open') ? 'visible' : 'hidden',
          pointerEvents: navBackdrop.classList.contains('open') ? 'auto' : 'none',
          transition: 'opacity 0.3s, visibility 0.3s',
          cursor: 'pointer'
        });
      }
    } else {
      // Desktop: clear all inline styles
      mainNav.style.cssText = '';
      mainNav.querySelectorAll('.nav-link').forEach(link => link.style.cssText = '');
      if (navClose) navClose.style.cssText = '';
      if (navBackdrop) navBackdrop.style.cssText = '';
    }
  }

  function openNav() {
    if (!mainNav) return;
    mainNav.classList.add('open');
    if (navBackdrop) navBackdrop.classList.add('open');
    document.body.classList.add('nav-open');
    document.body.style.overflow = 'hidden';

    // Apply visible state via transform
    setupMobileNav();
    // Use requestAnimationFrame to ensure transform animation runs
    requestAnimationFrame(() => {
      if (mainNav) mainNav.style.transform = 'translateX(0)';
      if (navBackdrop) {
        navBackdrop.style.opacity = '1';
        navBackdrop.style.visibility = 'visible';
        navBackdrop.style.pointerEvents = 'auto';
      }
    });
  }

  function closeNav() {
    if (!mainNav) return;
    mainNav.classList.remove('open');
    if (navBackdrop) navBackdrop.classList.remove('open');
    document.body.classList.remove('nav-open');
    document.body.style.overflow = '';

    if (window.innerWidth <= 992) {
      mainNav.style.transform = 'translateX(100%)';
      if (navBackdrop) {
        navBackdrop.style.opacity = '0';
        navBackdrop.style.visibility = 'hidden';
        navBackdrop.style.pointerEvents = 'none';
      }
    }
  }

  // Initial setup (sets the closed state inline)
  setupMobileNav();

  // Reapply on resize (handles orientation change too)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setupMobileNav, 100);
  });

  if (navToggle) navToggle.addEventListener('click', openNav);
  if (navClose) navClose.addEventListener('click', closeNav);
  if (navBackdrop) navBackdrop.addEventListener('click', closeNav);

  // NOTE: Do NOT auto-close menu on link click — that interrupts navigation
  // on iOS/mobile. Just let the link click do its thing.
  // The menu will naturally disappear when the new page loads.

  // ===== Search overlay =====
  const searchToggle = document.getElementById('searchToggle');
  const searchClose = document.getElementById('searchClose');
  const searchOverlay = document.getElementById('searchOverlay');
  if (searchToggle && searchOverlay) {
    searchToggle.addEventListener('click', () => {
      searchOverlay.classList.add('open');
      const input = searchOverlay.querySelector('input');
      if (input) setTimeout(() => input.focus(), 100);
    });
  }
  if (searchClose) searchClose.addEventListener('click', () => searchOverlay.classList.remove('open'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('open')) {
      searchOverlay.classList.remove('open');
    }
  });

  // ===== Sticky header on scroll =====
  const header = document.getElementById('siteHeader');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 80) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    });
  }

  // ===== Back to top =====
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) backToTop.classList.add('show');
      else backToTop.classList.remove('show');
    });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ===== Stats counter animation =====
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (statNumbers.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
          entry.target.classList.add('counted');
          const target = parseInt(entry.target.dataset.target);
          const text = entry.target.textContent;
          const suffix = text.replace(/[0-9]/g, '');
          let current = 0;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          const interval = setInterval(() => {
            current += increment;
            if (current >= target) {
              current = target;
              clearInterval(interval);
            }
            entry.target.textContent = Math.floor(current) + suffix;
          }, duration / steps);
        }
      });
    }, { threshold: 0.5 });
    statNumbers.forEach(el => observer.observe(el));
  }

  // ===== Language selector (Google Translate cookie switching) =====
  const langSelector = document.getElementById('langSelector');
  if (langSelector) {
    const langToggle = langSelector.querySelector('.lang-toggle');
    const langCurrent = langSelector.querySelector('.lang-current');
    const langFlagCurrent = langSelector.querySelector('.lang-flag-current');
    const options = langSelector.querySelectorAll('.lang-option');

    function updateCurrentFlag(lang) {
      if (!langFlagCurrent) return;
      const matched = langSelector.querySelector(`.lang-option[data-lang="${lang}"] .lang-flag-svg`);
      if (matched) {
        langFlagCurrent.innerHTML = matched.outerHTML;
      }
    }

    // Read saved language
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('googtrans='));
    if (cookie) {
      const value = cookie.split('=')[1];
      const lang = value.split('/').pop();
      if (lang && lang !== 'th') {
        const map = { en: 'EN', ja: 'JA', 'zh-CN': 'ZH' };
        if (langCurrent) langCurrent.textContent = map[lang] || lang.toUpperCase();
        options.forEach(opt => {
          opt.classList.toggle('active', opt.dataset.lang === lang);
        });
        updateCurrentFlag(lang);
      }
    }

    if (langToggle) {
      langToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        langSelector.classList.toggle('open');
      });
    }

    document.addEventListener('click', () => langSelector.classList.remove('open'));

    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = opt.dataset.lang;
        if (lang === 'th') {
          // Clear translation
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
        } else {
          document.cookie = `googtrans=/th/${lang}; path=/`;
          document.cookie = `googtrans=/th/${lang}; path=/; domain=.${location.hostname}`;
        }
        location.reload();
      });
    });
  }

  // ===== Mobile lang buttons (inside slide-out menu) =====
  const mobileLangBtns = document.querySelectorAll('.mobile-lang-btn');
  if (mobileLangBtns.length > 0) {
    // Sync active state with current cookie
    const cookieMobile = document.cookie.split(';').find(c => c.trim().startsWith('googtrans='));
    let currentLang = 'th';
    if (cookieMobile) {
      const value = cookieMobile.split('=')[1];
      const lang = value.split('/').pop();
      if (lang) currentLang = lang;
    }
    mobileLangBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = btn.dataset.lang;
        if (lang === 'th') {
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
        } else {
          document.cookie = `googtrans=/th/${lang}; path=/`;
          document.cookie = `googtrans=/th/${lang}; path=/; domain=.${location.hostname}`;
        }
        location.reload();
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '#!') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 100;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ===== Mobile menu sub-item accordion toggle =====
  document.querySelectorAll('.nav-mobile-toggle').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const li = this.closest('.has-mobile-sub');
      if (!li) return;
      const isOpen = li.classList.toggle('is-open');
      this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

});
