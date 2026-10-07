// =============================================================================
// Óptica Ocular — app.js
// =============================================================================

// Marcar que JS está ativo (fallback CSS depende disso)
document.documentElement.classList.add('js-ready');

// =============================================================================
// WhatsApp link builder
// =============================================================================
const whatsapp = message => `https://wa.me/5541997502091?text=${encodeURIComponent(message)}`;
document.querySelectorAll('[data-whatsapp]').forEach(link => {
  link.href = whatsapp(link.dataset.message || 'Olá! Vim pelo site da Óptica Ocular e gostaria de mais informações.');
});

// =============================================================================
// Mobile menu toggle
// =============================================================================
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav');

function openMenu() {
  if (!toggle || !nav) return;
  toggle.setAttribute('aria-expanded', 'true');
  nav.classList.add('open');
  document.body.classList.add('menu-open');
}

function closeMenu() {
  if (!toggle || !nav) return;
  toggle.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
  document.body.classList.remove('menu-open');
}

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    closeMenu();
  }));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });
}

// =============================================================================
// Interest form — pre-select from collection cards
// =============================================================================
document.querySelectorAll('[data-interest]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('[name="interesse"]').forEach(input => {
      input.checked = input.value === link.dataset.interest;
    });
  });
});

// =============================================================================
// Interest form — WhatsApp submit
// =============================================================================
const form = document.querySelector('#interest-form');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const interest = new FormData(event.currentTarget).get('interesse');
    const url = whatsapp(`Olá, Óptica Ocular! Vim pelo site e tenho interesse em: ${interest}. Podem me orientar?`);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    const status = document.querySelector('#form-status');
    if (status) {
      if (!opened) {
        // Popup foi bloqueado — mostrar fallback
        status.replaceChildren(document.createTextNode('O WhatsApp não abriu automaticamente. '));
        const fallback = document.createElement('a');
        fallback.href = url;
        fallback.target = '_blank';
        fallback.rel = 'noopener';
        fallback.textContent = 'Toque aqui para abrir.';
        fallback.style.textDecoration = 'underline';
        status.append(fallback);
      } else {
        status.replaceChildren(document.createTextNode('Abrindo WhatsApp… '));
        const fallback = document.createElement('a');
        fallback.href = url;
        fallback.target = '_blank';
        fallback.rel = 'noopener';
        fallback.textContent = 'Não abriu? Clique aqui.';
        fallback.style.textDecoration = 'underline';
        status.append(fallback);
      }
    }
  });
}

// =============================================================================
// Lentes tabs — data & accessible switcher
// =============================================================================
const lenses = {
  dia: [
    'Visão nítida e confortável',
    'Leitura, telas ou tarefas de precisão. Apresentamos as melhores opções de lentes monofocais com tratamentos antirreflexo e proteção contra luz azul.',
    'Uma escolha orientada com rigor pela sua receita e estilo de vida.'
  ],
  multi: [
    'Transição suave entre distâncias',
    'Para quem precisa de foco contínuo de perto a longe. Trabalhamos com as marcas de maior tecnologia para garantir rápida adaptação e nitidez.',
    'Adaptação acompanhada de perto por nossa equipe técnica.'
  ],
  foto: [
    'Adaptação inteligente à claridade',
    'Lentes que escurecem no sol e clareiam em ambientes fechados. Máximo conforto e proteção UV contínua para sua rotina diária.',
    'Consulte opções de tonalidades e tratamentos compatíveis.'
  ]
};

const tabs = [...document.querySelectorAll('[data-lens]')];
const lensPanel = document.querySelector('#lens-panel');

function selectLens(tab) {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  if (!lensPanel) return;
  lensPanel.setAttribute('aria-labelledby', tab.id);
  const data = lenses[tab.dataset.lens];
  if (data) {
    ['h3', 'p', '.lens-note'].forEach((selector, index) => {
      const el = lensPanel.querySelector(selector);
      if (el) el.textContent = data[index];
    });
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectLens(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectLens(tabs[next]);
      tabs[next].focus();
    }
  });
});

// =============================================================================
// Privacy dialog — accessible open/close with focus restoration
// =============================================================================
const privacy = document.querySelector('#privacy');
const privacyOpen = document.querySelector('#privacy-open');
if (privacy && privacyOpen) {
  privacyOpen.addEventListener('click', () => privacy.showModal());
  const closeBtn = privacy.querySelector('.dialog-close');
  if (closeBtn) closeBtn.addEventListener('click', () => privacy.close());

  // Backdrop click to close
  privacy.addEventListener('click', event => {
    if (event.target === privacy) {
      privacy.close();
    }
  });

  // Restore focus to trigger button on close
  privacy.addEventListener('close', () => {
    privacyOpen.focus();
  });
}

// =============================================================================
// Current year
// =============================================================================
const yearEl = document.querySelector('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// =============================================================================
// Hero Mockup — scroll-driven image pan (desktop only)
// =============================================================================
(function initHeroSinglePhotoScrollMockup() {
  const wrapper = document.querySelector('.hero-wrapper');
  const sticky = document.querySelector('.hero-sticky');
  const container = document.querySelector('#hero-scroll-container');
  const track = document.querySelector('#hero-scroll-track');
  if (!wrapper || !sticky || !container || !track) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let targetProgress = 0;
  let currentProgress = 0;
  let rafId = null;

  function calculateDesktopProgress() {
    const wrapperRect = wrapper.getBoundingClientRect();
    const maxScroll = wrapper.offsetHeight - sticky.offsetHeight;
    if (maxScroll <= 0) return 0;
    const currentScroll = -wrapperRect.top;
    return Math.max(0, Math.min(1, currentScroll / maxScroll));
  }

  function render(p) {
    const maxTranslate = Math.max(0, track.offsetHeight - container.clientHeight);
    const translateY = p * maxTranslate;
    track.style.transform = `translate3d(0, ${-translateY.toFixed(2)}px, 0)`;
  }

  function loop() {
    if (reducedMotion.matches) return;
    if (window.innerWidth <= 820) {
      rafId = null;
      return;
    }

    currentProgress += (targetProgress - currentProgress) * 0.12;
    render(currentProgress);

    if (Math.abs(targetProgress - currentProgress) > 0.0005) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  function queueUpdate() {
    if (!rafId && !reducedMotion.matches && window.innerWidth > 820) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function onWindowScroll() {
    if (window.innerWidth <= 820) return;
    targetProgress = calculateDesktopProgress();
    queueUpdate();
  }

  window.addEventListener('scroll', onWindowScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) {
      targetProgress = calculateDesktopProgress();
      currentProgress = targetProgress;
      render(currentProgress);
    }
  }, { passive: true });

  // Initial setup after images settle
  setTimeout(() => {
    if (window.innerWidth > 820) {
      targetProgress = calculateDesktopProgress();
      currentProgress = targetProgress;
      render(currentProgress);
    }
  }, 100);
})();

// =============================================================================
// Lenis Smooth Inertial Scroll
// =============================================================================
let lenis = null;
if (typeof Lenis !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.5,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Smooth anchor scrolling via Lenis (replaces native for smooth feel)
  // Use a Set to track anchors that already have Lenis handlers
  const lenisAnchors = new Set();
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          lenis.scrollTo(targetEl, { offset: -20 });
        }
      }
    });
    lenisAnchors.add(anchor);
  });
}

// =============================================================================
// Scroll Reveal Observer
// =============================================================================
(function initScrollReveals() {
  const reveals = document.querySelectorAll('.reveal, .reveal-scale');
  if (!reveals.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveals.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add('is-revealed');
        observer.unobserve(el);

        const cleanLayer = () => {
          el.style.willChange = 'auto';
          el.style.transform = 'none';
        };
        el.addEventListener('transitionend', cleanLayer, { once: true });
        setTimeout(cleanLayer, 1200);
      }
    });
  }, {
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.08
  });

  reveals.forEach(el => observer.observe(el));
})();
