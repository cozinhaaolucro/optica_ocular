// =============================================================================
// Óptica Ocular — Simulador de Lentes (lentes-cfg.js)
// Multi-step configurator: Tipo de visão → Marca → Produto → Configurações
// =============================================================================
(function () {
  'use strict';

  /* ── Category groups for UX simplification ── */
  const CAT_GROUPS = [
    {
      id: 'simples',
      label: 'Visão Simples',
      desc: 'Correção para uma distância',
      cats: [
        'Visão Simples', 'Visão Simples Digital', 'Visão Simples Especial',
        'Visão Simples Jovem', 'Monofocal Rodenstock', 'Monofocal Acabada',
        'Monofocal B.I.G. NORM', 'Mono Plus B.I.G. NORM'
      ]
    },
    {
      id: 'progressiva',
      label: 'Progressiva',
      desc: 'Perto, intermediário e longe',
      cats: [
        'Progressiva', 'Progressiva Especial', 'Progressiva Freeform',
        'Progressiva ILT', 'Progressiva B.I.G. NORM', 'Progressiva AdaptiveSun'
      ]
    },
    {
      id: 'ocupacional',
      label: 'Ocupacional',
      desc: 'Para trabalho e uso prolongado',
      cats: ['Ocupacional', 'Ocupacional B.I.G. NORM']
    },
    {
      id: 'especiais',
      label: 'Especiais',
      desc: 'Bifocal, controle de miopia e mais',
      cats: [
        'Controle de Miopia', 'Especial Digital', 'Bifocal',
        'Lentes Prontas', 'Netline', 'AdaptiveSun', 'Asiana'
      ]
    }
  ];

  const BRAND_LOGOS = {
    'HOYA': 'assets/brands/hoya-clean.png',
    'Rodenstock': 'assets/brands/rodenstock.png',
    'ZEISS': 'assets/brands/zeiss-clean.png'
  };

  /* ── State ── */
  let lensData = null;
  let state = { step: 0, group: null, marca: null, categoria: null, produto: null };

  /* ── DOM ── */
  const formEl = document.getElementById('interest-form');
  const cfgEl = document.getElementById('lens-configurator');
  if (!formEl || !cfgEl) return;

  const backBtn = cfgEl.querySelector('.lens-cfg-back');
  const closeBtn = cfgEl.querySelector('.lens-cfg-close');
  const bcEl = cfgEl.querySelector('.lens-cfg-breadcrumb');
  const titleEl = cfgEl.querySelector('.lens-cfg-title');
  const bodyEl = cfgEl.querySelector('.lens-cfg-body');
  const loadingEl = cfgEl.querySelector('.lens-cfg-loading');

  /* ── Helpers ── */
  function fmtPrice(n) {
    return n.toLocaleString('pt-BR');
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /* ── Data loading (lazy) ── */
  async function ensureData() {
    if (lensData) return true;
    loadingEl.hidden = false;
    bodyEl.hidden = true;
    try {
      const resp = await fetch('assets/lentes-data.json');
      if (!resp.ok) throw new Error(resp.status);
      lensData = await resp.json();
    } catch (err) {
      bodyEl.innerHTML = '<p class="lens-cfg-error">Não foi possível carregar o catálogo.<br>Tente novamente em instantes.</p>';
      bodyEl.hidden = false;
      loadingEl.hidden = true;
      return false;
    }
    loadingEl.hidden = true;
    bodyEl.hidden = false;
    return true;
  }

  /* ── Open / Close configurator ── */
  function openCfg() {
    formEl.classList.add('lens-form-hiding');
    setTimeout(function () {
      formEl.hidden = true;
      formEl.classList.remove('lens-form-hiding');
      cfgEl.hidden = false;
      // Force reflow before adding visible class for transition
      void cfgEl.offsetHeight;
      cfgEl.classList.add('lens-cfg-visible');
      ensureData().then(function (ok) {
        if (ok) goTo(1);
      });
    }, 260);
  }

  function closeCfg() {
    cfgEl.classList.remove('lens-cfg-visible');
    setTimeout(function () {
      cfgEl.hidden = true;
      formEl.hidden = false;
      void formEl.offsetHeight;
      formEl.classList.add('lens-form-showing');
      setTimeout(function () {
        formEl.classList.remove('lens-form-showing');
      }, 350);
    }, 260);
    state = { step: 0, group: null, marca: null, categoria: null, produto: null };
  }

  /* ── Navigation ── */
  function goTo(step) {
    state.step = step;
    updateUI();
  }

  function goBack() {
    if (state.step <= 1) { closeCfg(); return; }
    if (state.step === 4) { state.produto = null; state.categoria = null; }
    if (state.step === 3) state.marca = null;
    if (state.step === 2) state.group = null;
    goTo(state.step - 1);
  }

  /* ── UI update orchestrator ── */
  function updateUI() {
    // Breadcrumb
    var parts = [];
    if (state.group) parts.push(state.group.label);
    if (state.marca) parts.push(state.marca);
    if (state.produto) parts.push(state.produto);

    bcEl.innerHTML = parts.length === 0
      ? ''
      : parts.map(function (p, i) {
          var cls = i === parts.length - 1 ? ' lens-bc-active' : '';
          return '<span class="lens-bc-item' + cls + '">' + esc(p) + '</span>';
        }).join('<span class="lens-bc-sep" aria-hidden="true">›</span>');

    // Title
    var titles = {
      1: 'Qual o tipo de visão?',
      2: 'Escolha a marca',
      3: 'Escolha o produto',
      4: 'Configurações e valores'
    };
    titleEl.textContent = titles[state.step] || '';

    // Back button label
    backBtn.querySelector('span').textContent = state.step <= 1 ? 'Voltar ao formulário' : 'Voltar';

    // Body fade-swap
    bodyEl.classList.add('lens-cfg-fading');
    setTimeout(function () {
      renderStep();
      bodyEl.classList.remove('lens-cfg-fading');
    }, 160);
  }

  /* ── Step rendering ── */
  function renderStep() {
    switch (state.step) {
      case 1: renderGroups(); break;
      case 2: renderBrands(); break;
      case 3: renderProducts(); break;
      case 4: renderConfigs(); break;
    }
  }

  /* ── Step 1: Tipo de visão ── */
  function renderGroups() {
    var html = '<div class="lens-cfg-grid">';
    CAT_GROUPS.forEach(function (g) {
      html += '<button class="lens-cfg-option" data-gid="' + g.id + '" type="button">' +
        '<span class="lens-cfg-opt-label">' + esc(g.label) + '</span>' +
        '<span class="lens-cfg-opt-desc">' + esc(g.desc) + '</span>' +
        '</button>';
    });
    html += '</div>';
    bodyEl.innerHTML = html;

    bodyEl.querySelectorAll('[data-gid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.group = CAT_GROUPS.find(function (g) { return g.id === btn.dataset.gid; });
        goTo(2);
      });
    });
  }

  /* ── Step 2: Marca ── */
  function renderBrands() {
    var brands = [];
    Object.keys(lensData).forEach(function (marca) {
      var catData = lensData[marca];
      var has = state.group.cats.some(function (c) { return !!catData[c]; });
      if (!has) return;
      var count = 0;
      state.group.cats.forEach(function (c) {
        if (!catData[c]) return;
        Object.values(catData[c]).forEach(function (prod) {
          Object.values(prod).forEach(function (opts) { count += opts.length; });
        });
      });
      brands.push({ name: marca, count: count });
    });

    // Sort brands alphabetically
    brands.sort(function (a, b) { return a.name.localeCompare(b.name); });

    var html = '<div class="lens-cfg-grid lens-cfg-grid-brands">';
    brands.forEach(function (b) {
      html += '<button class="lens-cfg-option lens-cfg-brand-opt" data-marca="' + esc(b.name) + '" type="button">' +
        '<img src="' + (BRAND_LOGOS[b.name] || '') + '" alt="' + esc(b.name) + '" class="lens-cfg-brand-logo" loading="lazy">' +
        '<span class="lens-cfg-opt-desc">' + b.count + ' opções</span>' +
        '</button>';
    });
    html += '</div>';

    if (brands.length === 0) {
      html = '<p class="lens-cfg-empty">Nenhuma marca disponível nesta categoria.</p>';
    }

    bodyEl.innerHTML = html;
    bodyEl.querySelectorAll('[data-marca]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.marca = btn.dataset.marca;
        goTo(3);
      });
    });
  }

  /* ── Step 3: Produto ── */
  function renderProducts() {
    var marcaData = lensData[state.marca];
    var products = [];

    state.group.cats.forEach(function (cat) {
      if (!marcaData[cat]) return;
      Object.keys(marcaData[cat]).forEach(function (prodName) {
        var opcoes = marcaData[cat][prodName];
        var minP = Infinity, total = 0;
        Object.values(opcoes).forEach(function (configs) {
          configs.forEach(function (c) {
            if (c.p < minP) minP = c.p;
            total++;
          });
        });
        products.push({ name: prodName, cat: cat, min: minP, count: total });
      });
    });

    products.sort(function (a, b) { return a.min - b.min; });

    var html = '<div class="lens-cfg-products">';
    products.forEach(function (p) {
      html += '<button class="lens-cfg-product" data-prod="' + esc(p.name) + '" data-cat="' + esc(p.cat) + '" type="button">' +
        '<div class="lens-cfg-prod-info">' +
          '<span class="lens-cfg-prod-name">' + esc(p.name) + '</span>' +
          '<span class="lens-cfg-prod-cat">' + esc(p.cat) + '</span>' +
        '</div>' +
        '<div class="lens-cfg-prod-price">' +
          '<span class="lens-cfg-price-from">a partir de</span>' +
          '<span class="lens-cfg-price-val">R$ ' + fmtPrice(p.min) + '</span>' +
        '</div>' +
        '</button>';
    });
    html += '</div>';

    if (products.length === 0) {
      html = '<p class="lens-cfg-empty">Nenhum produto encontrado.</p>';
    }

    bodyEl.innerHTML = html;
    bodyEl.querySelectorAll('[data-prod]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.produto = btn.dataset.prod;
        state.categoria = btn.dataset.cat;
        goTo(4);
      });
    });
  }

  /* ── Step 4: Configurações ── */
  function renderConfigs() {
    var opcoes = lensData[state.marca][state.categoria][state.produto];
    var opcaoKeys = Object.keys(opcoes);

    var html = '<div class="lens-cfg-configs">';

    opcaoKeys.forEach(function (opcao) {
      var configs = opcoes[opcao];
      html += '<div class="lens-cfg-opcao">';
      if (opcaoKeys.length > 1) {
        html += '<h4 class="lens-cfg-opcao-label">' + esc(opcao) + '</h4>';
      }
      html += '<div class="lens-cfg-config-list">';
      configs.forEach(function (c) {
        html += '<div class="lens-cfg-config-row">' +
          '<div class="lens-cfg-config-detail">' +
            '<span class="lens-cfg-config-mat">' + esc(c.m) + (c.i ? ' · índice ' + esc(c.i) : '') + '</span>' +
            '<span class="lens-cfg-config-trt">' + esc(c.t) + '</span>' +
            (c.e ? '<span class="lens-cfg-config-esf">' + esc(c.e) + '</span>' : '') +
          '</div>' +
          '<div class="lens-cfg-config-val">' +
            '<span class="lens-cfg-config-price">R$ ' + fmtPrice(c.p) + '</span>' +
            '<span class="lens-cfg-config-unit">o par</span>' +
          '</div>' +
          '</div>';
      });
      html += '</div></div>';
    });

    // WhatsApp CTA
    var msg = 'Olá! Vim pelo simulador de lentes do site e gostaria de saber mais sobre a lente ' +
      state.produto + ' (' + state.marca + ', ' + state.group.label + '). Podem me orientar?';
    var waUrl = 'https://wa.me/5541997502091?text=' + encodeURIComponent(msg);

    html += '<div class="lens-cfg-footer">' +
      '<p class="lens-cfg-disclaimer">Valores de referência por par de lentes, conforme tabela do fabricante. ' +
      'A orientação final depende da sua receita e armação escolhida.</p>' +
      '<a class="button lens-cfg-wa" href="' + waUrl + '" target="_blank" rel="noopener">' +
        'Conversar sobre esta lente' +
      '</a>' +
      '</div>';

    html += '</div>';
    bodyEl.innerHTML = html;
  }

  /* ── Event listeners ── */
  backBtn.addEventListener('click', goBack);
  closeBtn.addEventListener('click', closeCfg);

  // Intercept the "Lentes" radio button to open configurator
  var lensLabel = null;
  document.querySelectorAll('#interest-form input[name="interesse"]').forEach(function (radio) {
    if (radio.value === 'Lentes') {
      lensLabel = radio.closest('label');
    }
  });

  if (lensLabel) {
    lensLabel.addEventListener('click', function (e) {
      e.preventDefault();
      openCfg();
    });
  }

  // Allow keyboard activation on the label
  if (lensLabel) {
    lensLabel.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCfg();
      }
    });
  }
})();
