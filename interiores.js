/* Melhoria progressiva: as páginas e os contatos continuam úteis sem JavaScript. */
(() => {
  'use strict';
  document.documentElement.classList.add('js-enabled');
  const whatsapp = message => `https://wa.me/5541997502091?text=${encodeURIComponent(message)}`;
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  const mobile = matchMedia('(max-width: 820px)');
  function closeMenu(restoreFocus = false) {
    menu.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');
    if (restoreFocus) menu.focus();
  }
  if (menu && nav) {
    menu.hidden = false;
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('click', e => {
      if (nav.classList.contains('open') && !e.target.closest('.header')) closeMenu();
    });
    document.addEventListener('keydown', e => {
      if (!nav.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
      if (e.key === 'Tab') {
        const focusable = [menu, ...nav.querySelectorAll('a')];
        const first = focusable[0], last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    mobile.addEventListener('change', () => closeMenu());
  }

  // Abas de lentes com teclado; sem JS todos os artigos permanecem visíveis.
  const tablist = document.querySelector('.lens-tablist');
  if (tablist) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const activate = (tab, focus = false, updateHash = false) => {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        panel.hidden = !selected;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', item.id);
        panel.tabIndex = 0;
      });
      if (focus) tab.focus();
      if (updateHash) history.replaceState(null, '', '#' + tab.getAttribute('aria-controls'));
    };
    tablist.hidden = false;
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab, false, true));
      tab.addEventListener('keydown', e => {
        let next;
        if (['ArrowRight','ArrowDown'].includes(e.key)) next = (index + 1) % tabs.length;
        if (['ArrowLeft','ArrowUp'].includes(e.key)) next = (index + tabs.length - 1) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { e.preventDefault(); activate(tabs[next], true, true); }
      });
    });
    const fromHash = () => {
      const selected = tabs.find(tab => '#' + tab.getAttribute('aria-controls') === location.hash);
      if (selected) activate(selected);
    };
    activate(tabs[0]); fromHash();
    window.addEventListener('hashchange', fromHash);
  }

  // Busca tolerante a acentos, combinada com a categoria.
  const search = document.querySelector('#faq-search');
  if (search) {
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    const questions = [...document.querySelectorAll('[data-faq]')];
    const filters = [...document.querySelectorAll('[data-filter]')];
    const count = document.querySelector('.faq-count');
    let category = 'Todas';
    document.querySelector('.faq-tools').hidden = false;

    const filter = () => {
      const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
      let total = 0;
      questions.forEach(question => {
        const visible = (category === 'Todas' || category === question.dataset.category) && terms.every(term => normalize(question.textContent).includes(term));
        question.hidden = !visible;
        if (visible) total++;
        else question.open = false;
      });
      count.hidden = !terms.length && category === 'Todas';
      count.textContent = `${total} ${total === 1 ? 'resposta encontrada' : 'respostas encontradas'}`;
      document.querySelector('.faq-empty').hidden = total > 0;
    };
    filters.forEach(button => button.addEventListener('click', () => {
      category = button.dataset.filter;
      filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      filter();
    }));
    search.addEventListener('input', filter);
    document.querySelector('#clear-search').addEventListener('click', () => {
      search.value = ''; category = 'Todas';
      filters.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.filter === 'Todas')));
      filter(); search.focus();
    });
    filter();
  }

  // A prévia é construída com textContent; nenhum campo vai a um backend.
  const conversation = document.querySelector('#conversation-form');
  if (conversation) {
    const preview = document.querySelector('#message-preview');
    const contactLink = document.querySelector('#conversation-link');

    const update = () => {
      const data = new FormData(conversation);
      const name = String(data.get('nome') || '').trim().slice(0, 60);
      const note = String(data.get('mensagem') || '').trim().slice(0, 500);
      const message = `Olá, Óptica Ocular!${name ? ` Sou ${name}.` : ''} Vim pelo site e gostaria de conversar sobre: ${data.get('interesse')}.${note ? `\n\n${note}` : ''}`;
      document.querySelector('.message-preview').hidden = !(name || note || data.get('interesse') !== 'Óculos de grau');
      preview.textContent = message;
      contactLink.href = whatsapp(message);
    };
    conversation.addEventListener('input', update);
    conversation.addEventListener('change', update);
    conversation.addEventListener('submit', e => e.preventDefault());
    update();
  }

})();
