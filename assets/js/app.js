/* ==========================================================================
   TechStore — script principal
   Cada página HTML define <body data-page="..."> e este arquivo monta
   o cabeçalho, o rodapé e o conteúdo dinâmico daquela página.
   Os produtos vêm de assets/js/data.js.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Configurações ---------- */
  var PRODUCTS = window.TS_PRODUCTS || [];
  var CATS = [
    { slug: 'todos', label: 'Todos' },
    { slug: 'perifericos', label: 'Periféricos' },
    { slug: 'audio', label: 'Áudio' },
    { slug: 'video', label: 'Vídeo' },
    { slug: 'monitores', label: 'Monitores' },
    { slug: 'acessorios', label: 'Acessórios' }
  ];
  var PIX_DISCOUNT = 0.05;     // 5% de desconto no Pix (valor de exemplo)
  var MAX_INSTALLMENTS = 12;   // "até 12x", como já dizia o rodapé original
  var MAX_QTY = 20;
  var CART_KEY = 'techstore.cart.v1';
  var EMAIL = 'suporte@techstore.com.br';

  /* ---------- Utilitários ---------- */
  function brl(n) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byId(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }
  function catLabel(slug) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].slug === slug) return CATS[i].label;
    return slug;
  }
  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  function normalize(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var ICONS = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
  };

  /* ---------- Carrinho (localStorage, com plano B em memória) ---------- */
  var memoryCart = {};
  var Cart = {
    read: function () {
      try {
        var raw = JSON.parse(window.localStorage.getItem(CART_KEY) || '{}');
        return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      } catch (e) { return memoryCart; }
    },
    write: function (data) {
      memoryCart = data;
      try { window.localStorage.setItem(CART_KEY, JSON.stringify(data)); } catch (e) { /* storage bloqueado */ }
      document.dispatchEvent(new CustomEvent('cart:change'));
    },
    add: function (id, qty) {
      if (!byId(id)) return;
      var c = this.read();
      c[id] = Math.min(MAX_QTY, (parseInt(c[id], 10) || 0) + (qty || 1));
      this.write(c);
    },
    set: function (id, qty) {
      var c = this.read();
      qty = Math.max(0, Math.min(MAX_QTY, parseInt(qty, 10) || 0));
      if (qty === 0) delete c[id]; else c[id] = qty;
      this.write(c);
    },
    remove: function (id) { this.set(id, 0); },
    clear: function () { this.write({}); },
    lines: function () {
      var c = this.read(), out = [];
      Object.keys(c).forEach(function (id) {
        var p = byId(id), q = parseInt(c[id], 10);
        if (p && q > 0) out.push({ p: p, qty: q });
      });
      return out;
    },
    count: function () {
      return this.lines().reduce(function (s, l) { return s + l.qty; }, 0);
    },
    subtotal: function () {
      return this.lines().reduce(function (s, l) { return s + l.p.price * l.qty; }, 0);
    }
  };

  /* ---------- Aviso (toast) ---------- */
  var toastTimer;
  function toast(message, linkHref, linkText) {
    var el = $('#toast');
    if (!el) return;
    el.innerHTML = '<span>' + esc(message) + '</span>' +
      (linkHref ? '<a href="' + linkHref + '">' + esc(linkText) + '</a>' : '');
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 4000);
  }

  /* ---------- Cabeçalho ---------- */
  function renderHeader(activeCat, activePage) {
    var nav = CATS.map(function (c) {
      var href = c.slug === 'todos' ? 'catalogo.html' : 'catalogo.html?cat=' + c.slug;
      var current = activeCat === c.slug ? ' aria-current="page"' : '';
      return '<li><a href="' + href + '"' + current + '>' + c.label + '</a></li>';
    }).join('');

    function cur(page) { return activePage === page ? ' aria-current="page"' : ''; }

    return '' +
      '<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>' +
      '<header class="site-header">' +
        '<div class="container header-content">' +
          '<div class="logo"><a href="index.html"><img src="assets/img/logo.png" alt="TechStore — página inicial" width="168" height="56"></a></div>' +
          '<p class="tagline sekuya-regular">Toda tecnologia começa como sonho antes de virar ferramenta.</p>' +
          '<div class="header-actions">' +
            '<a class="icon-btn" href="carrinho.html" aria-label="Carrinho"><span class="cart-icon">' + ICONS.cart + '</span><span class="cart-count" hidden>0</span></a>' +
            '<button class="icon-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="menu-panel" aria-label="Menu">' + ICONS.menu + '</button>' +
            '<ul class="menu-panel" id="menu-panel" hidden>' +
              '<li><a href="index.html"' + cur('home') + '>Início</a></li>' +
              '<li><a href="catalogo.html"' + cur('catalogo') + '>Produtos</a></li>' +
              '<li><a href="sobre.html"' + cur('sobre') + '>Sobre</a></li>' +
              '<li><a href="contato.html"' + cur('contato') + '>Contato</a></li>' +
              '<li><a href="carrinho.html"' + cur('carrinho') + '>Carrinho <span class="menu-count"></span></a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="category-bar"><div class="container"><nav class="nav-list" aria-label="Categorias"><ul>' + nav + '</ul></nav></div></div>' +
      '</header>';
  }

  function initMenu() {
    var btn = $('#menu-btn'), panel = $('#menu-panel');
    if (!btn || !panel) return;
    function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); }
    });
  }

  function updateCartBadge() {
    var n = Cart.count();
    var badge = $('.cart-count');
    if (badge) { badge.textContent = n > 99 ? '99+' : n; badge.hidden = n === 0; }
    var link = $('.icon-btn[href="carrinho.html"]');
    if (link) link.setAttribute('aria-label', 'Carrinho, ' + n + (n === 1 ? ' item' : ' itens'));
    var m = $('.menu-count');
    if (m) m.textContent = n ? '(' + n + ')' : '';
  }

  /* ---------- Rodapé ---------- */
  function renderFooter() {
    var depts = CATS.slice(1).map(function (c) {
      return '<li><a href="catalogo.html?cat=' + c.slug + '">' + c.label + '</a></li>';
    }).join('');
    return '' +
      '<footer class="site-footer">' +
        '<div class="container footer-grid">' +
          '<div class="footer-col footer-brand">' +
            '<img src="assets/img/logo.png" alt="TechStore" width="150" height="50">' +
            '<p>Tecnologia com preço justo, entrega rápida e suporte de verdade.</p>' +
            '<form class="newsletter-form" id="newsletter" novalidate>' +
              '<label class="visually-hidden" for="nl-email">Seu e-mail</label>' +
              '<input class="input" id="nl-email" type="email" placeholder="Seu e-mail" autocomplete="email" required>' +
              '<button class="btn" type="submit">Quero receber</button>' +
            '</form>' +
            '<p class="newsletter-msg" id="nl-msg" role="status"></p>' +
            '<p style="font-size:.85rem">Receba ofertas em primeira mão. Promoções e lançamentos no seu e-mail. Sem spam.</p>' +
          '</div>' +
          '<div class="footer-col"><h3>Departamentos</h3><ul>' + depts + '</ul></div>' +
          '<div class="footer-col"><h3>Institucional</h3><ul>' +
            '<li><a href="sobre.html">Sobre a TechStore</a></li>' +
            '<li><a href="contato.html">Contato</a></li>' +
            '<li><a href="carrinho.html">Carrinho</a></li>' +
          '</ul></div>' +
          '<div class="footer-col"><h3>Atendimento</h3><ul>' +
            '<li><a href="mailto:' + EMAIL + '">' + EMAIL + '</a></li>' +
            '<li><a href="https://wa.me/5554999999999">WhatsApp: (54) 99999-9999</a></li>' +
            '<li>Seg a sex, 9h às 18h; sáb, 9h às 13h</li>' +
          '</ul></div>' +
        '</div>' +
        '<div class="container footer-trust">' +
          '<span>Compra 100% segura</span><span>Pagamento em até 12x</span><span>Pix com desconto</span>' +
          '<span>Visa, Mastercard, Elo, American Express, Pix, boleto</span>' +
        '</div>' +
        '<div class="footer-bottom"><div class="container footer-bottom-content">' +
          '<p>© 2026 TechStore. Todos os direitos reservados.</p>' +
          '<p>CNPJ: 00.000.000/0001-00 · Rua Exemplo, 000, Caxias do Sul, RS</p>' +
          '<p class="legal-links"><span class="soon">Termos de uso</span><span class="soon">Política de privacidade</span><span class="soon">Política de cookies</span></p>' +
        '</div></div>' +
      '</footer>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
  }

  function initNewsletter() {
    var form = $('#newsletter');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#nl-email'), msg = $('#nl-msg');
      if (!input.value || !input.checkValidity()) {
        msg.style.color = '#ffb4a9';
        msg.textContent = 'Digite um e-mail válido, como nome@exemplo.com.';
        input.focus();
        return;
      }
      msg.style.color = '';
      msg.textContent = 'Pronto! Você vai receber nossas ofertas.';
      form.reset();
    });
  }

  /* ---------- Card de produto ---------- */
  function cardHTML(p) {
    return '' +
      '<li class="product-card">' +
        '<a class="thumb" href="produto.html?id=' + p.id + '" tabindex="-1" aria-hidden="true">' +
          '<img src="' + p.img + '" alt="" loading="lazy" width="400" height="400"></a>' +
        '<div class="info">' +
          '<p class="cat">' + esc(catLabel(p.cat)) + '</p>' +
          '<h3><a href="produto.html?id=' + p.id + '">' + esc(p.name) + '</a></h3>' +
          '<p class="price">' + brl(p.price) + '</p>' +
          '<p class="pix">' + brl(p.price * (1 - PIX_DISCOUNT)) + ' no Pix</p>' +
          '<button class="btn btn--small btn--block" type="button" data-add="' + p.id + '">Adicionar ao carrinho</button>' +
        '</div>' +
      '</li>';
  }

  // Um único listener cuida de todos os botões "Adicionar ao carrinho" da página
  function initAddButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add]');
      if (!btn) return;
      Cart.add(btn.getAttribute('data-add'), 1);
      var p = byId(btn.getAttribute('data-add'));
      toast((p ? p.name : 'Produto') + ' foi para o carrinho.', 'carrinho.html', 'Ver carrinho');
    });
  }

  /* ---------- Página: início ---------- */
  function pageHome() {
    var featured = (window.TS_FEATURED || []).map(byId).filter(Boolean);
    var home = (window.TS_HOME || []).map(byId).filter(Boolean);

    var slides = featured.map(function (p, i) {
      return '' +
        '<div class="slide' + (i === 0 ? ' is-active' : '') + '" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' de ' + featured.length + '"' + (i === 0 ? '' : ' aria-hidden="true"') + '>' +
          '<div class="slide-text">' +
            '<p class="slide-cat">' + esc(catLabel(p.cat)) + '</p>' +
            '<h2>' + esc(p.name) + '</h2>' +
            '<p class="slide-tag">' + esc(p.tagline) + '</p>' +
            '<p class="slide-price">' + brl(p.price) + '<small>ou ' + brl(p.price * (1 - PIX_DISCOUNT)) + ' no Pix</small></p>' +
            '<a class="btn" href="produto.html?id=' + p.id + '"' + (i === 0 ? '' : ' tabindex="-1"') + '>Ver produto</a>' +
          '</div>' +
          '<div class="slide-media"><img src="' + p.img + '" alt="' + esc(p.name) + '"' + (i === 0 ? '' : ' loading="lazy"') + '></div>' +
        '</div>';
    }).join('');

    var dots = featured.map(function (p, i) {
      return '<button class="dot" type="button" aria-label="Ir para o destaque ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : '') + '></button>';
    }).join('');

    $('#conteudo').innerHTML = '' +
      '<section class="hero container" aria-label="Destaques">' +
        '<div class="carousel" role="region" aria-roledescription="carrossel" aria-label="Produtos em destaque">' +
          '<div class="carousel-track" aria-live="off">' + slides + '</div>' +
          '<div class="carousel-controls">' +
            '<button class="carousel-btn" type="button" id="c-prev" aria-label="Destaque anterior">' + ICONS.prev + '</button>' +
            '<div class="dots">' + dots + '</div>' +
            '<button class="carousel-btn" type="button" id="c-next" aria-label="Próximo destaque">' + ICONS.next + '</button>' +
            '<button class="carousel-btn" type="button" id="c-toggle" aria-label="Pausar rotação automática">' + ICONS.pause + '</button>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="section container" aria-labelledby="t-prod">' +
        '<div class="section-head"><h2 id="t-prod">Produtos</h2><a href="catalogo.html">Ver todos os ' + PRODUCTS.length + ' produtos</a></div>' +
        '<ul class="product-grid">' + home.map(cardHTML).join('') + '</ul>' +
      '</section>';

    initCarousel(featured.length);
  }

  function initCarousel(total) {
    if (total < 2) return;
    var root = $('.carousel');
    var slides = $all('.slide', root), dots = $all('.dot', root);
    var toggle = $('#c-toggle');
    var index = 0, timer = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var userPaused = reduce; // quem pede menos movimento não recebe rotação automática

    function show(i) {
      index = (i + total) % total;
      slides.forEach(function (s, n) {
        var on = n === index;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', String(!on));
        $all('a', s).forEach(function (a) { a.tabIndex = on ? 0 : -1; });
      });
      dots.forEach(function (d, n) {
        if (n === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    }
    function stop() { clearInterval(timer); timer = null; }
    function start() { stop(); if (!userPaused) timer = setInterval(function () { show(index + 1); }, 6000); }
    function syncToggle() {
      toggle.innerHTML = userPaused ? ICONS.play : ICONS.pause;
      toggle.setAttribute('aria-label', userPaused ? 'Retomar rotação automática' : 'Pausar rotação automática');
    }

    $('#c-prev').addEventListener('click', function () { show(index - 1); start(); });
    $('#c-next').addEventListener('click', function () { show(index + 1); start(); });
    dots.forEach(function (d, n) { d.addEventListener('click', function () { show(n); start(); }); });
    toggle.addEventListener('click', function () { userPaused = !userPaused; syncToggle(); start(); });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    // Deslizar o dedo no celular
    var x0 = null;
    root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) { show(index + (dx < 0 ? 1 : -1)); start(); }
      x0 = null;
    });

    syncToggle();
    start();
  }

  /* ---------- Página: catálogo ---------- */
  function pageCatalog() {
    var cat = param('cat');
    if (!CATS.some(function (c) { return c.slug === cat; })) cat = 'todos';
    document.title = (cat === 'todos' ? 'Todos os produtos' : catLabel(cat)) + ' — TechStore';

    $('#conteudo').innerHTML = '' +
      '<div class="container">' +
        '<div class="page-head"><h1>' + (cat === 'todos' ? 'Todos os produtos' : esc(catLabel(cat))) + '</h1></div>' +
        '<div class="toolbar">' +
          '<div class="field search"><label for="busca">Buscar produto</label>' +
            '<input class="input" id="busca" type="search" placeholder="Ex.: webcam, cabo, headset" autocomplete="off"></div>' +
          '<div class="field"><label for="ordem">Ordenar por</label>' +
            '<select class="select" id="ordem">' +
              '<option value="padrao">Relevância</option>' +
              '<option value="menor">Menor preço</option>' +
              '<option value="maior">Maior preço</option>' +
              '<option value="nome">Nome (A–Z)</option>' +
            '</select></div>' +
        '</div>' +
        '<p class="result-count" id="contagem" role="status"></p>' +
        '<ul class="product-grid" id="lista"></ul>' +
        '<div id="vazio"></div>' +
      '</div>';

    var input = $('#busca'), sel = $('#ordem'), list = $('#lista'), count = $('#contagem'), empty = $('#vazio');

    function render() {
      var q = normalize(input.value.trim());
      var items = PRODUCTS.filter(function (p) {
        return (cat === 'todos' || p.cat === cat) &&
          (!q || normalize(p.name + ' ' + p.desc + ' ' + catLabel(p.cat)).indexOf(q) !== -1);
      });
      var order = sel.value;
      if (order === 'menor') items.sort(function (a, b) { return a.price - b.price; });
      if (order === 'maior') items.sort(function (a, b) { return b.price - a.price; });
      if (order === 'nome') items.sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });

      list.innerHTML = items.map(cardHTML).join('');
      count.textContent = items.length + (items.length === 1 ? ' produto encontrado' : ' produtos encontrados');
      empty.innerHTML = items.length ? '' :
        '<div class="empty"><h2>Nenhum produto encontrado</h2>' +
        '<p>Confira a grafia ou tente uma palavra mais curta.</p>' +
        '<a class="btn btn--ghost" href="catalogo.html">Ver todos os produtos</a></div>';
    }
    input.addEventListener('input', render);
    sel.addEventListener('change', render);
    render();
  }

  /* ---------- Página: produto ---------- */
  function pageProduct() {
    var p = byId(param('id') || '');
    var box = $('#conteudo');
    if (!p) {
      document.title = 'Produto não encontrado — TechStore';
      box.innerHTML = '<div class="container section"><div class="empty"><h1>Produto não encontrado</h1>' +
        '<p>O link pode estar incorreto ou o produto saiu do catálogo.</p>' +
        '<a class="btn" href="catalogo.html">Ver todos os produtos</a></div></div>';
      return;
    }
    document.title = p.name + ' — TechStore';

    var specs = p.specs.map(function (s) {
      var i = s.indexOf(': ');
      if (i > 0 && i <= 32) return '<li><strong>' + esc(s.slice(0, i)) + ':</strong> ' + esc(s.slice(i + 2)) + '</li>';
      return '<li>' + esc(s) + '</li>';
    }).join('');

    var installment = brl(p.price / MAX_INSTALLMENTS);
    var related = PRODUCTS.filter(function (r) { return r.cat === p.cat && r.id !== p.id; }).slice(0, 4);

    box.innerHTML = '' +
      '<div class="container">' +
        '<nav class="breadcrumb" aria-label="Você está em"><ol>' +
          '<li><a href="index.html">Início</a></li>' +
          '<li><a href="catalogo.html?cat=' + p.cat + '">' + esc(catLabel(p.cat)) + '</a></li>' +
          '<li aria-current="page">' + esc(p.name) + '</li>' +
        '</ol></nav>' +
        '<article class="product-detail">' +
          '<div class="product-photo"><img src="' + p.img + '" alt="' + esc(p.name) + '" width="600" height="600"></div>' +
          '<div class="product-buy">' +
            '<h1>' + esc(p.name) + '</h1>' +
            '<p class="tag">' + esc(p.tagline) + '</p>' +
            '<div class="price-box">' +
              '<p class="price">' + brl(p.price) + '</p>' +
              '<p class="pix">' + brl(p.price * (1 - PIX_DISCOUNT)) + ' no Pix (' + Math.round(PIX_DISCOUNT * 100) + '% de desconto)</p>' +
              '<p class="parcel">ou em até ' + MAX_INSTALLMENTS + 'x de ' + installment + ' no cartão</p>' +
            '</div>' +
            '<div class="buy-row">' +
              '<div class="stepper" role="group" aria-label="Quantidade">' +
                '<button type="button" id="q-minus" aria-label="Diminuir quantidade">−</button>' +
                '<input id="qty" type="number" inputmode="numeric" min="1" max="' + MAX_QTY + '" value="1" aria-label="Quantidade">' +
                '<button type="button" id="q-plus" aria-label="Aumentar quantidade">+</button>' +
              '</div>' +
              '<button class="btn" type="button" id="buy-add">Adicionar ao carrinho</button>' +
              '<button class="btn btn--ghost" type="button" id="buy-now">Comprar agora</button>' +
            '</div>' +
          '</div>' +
        '</article>' +
        '<div class="product-info">' +
          '<section aria-labelledby="t-desc"><h2 id="t-desc">Descrição</h2><p>' + esc(p.desc) + '</p></section>' +
          '<section aria-labelledby="t-spec"><h2 id="t-spec">Especificações</h2><ul class="specs">' + specs + '</ul></section>' +
        '</div>' +
        (related.length ?
          '<section class="section" style="padding-top:0" aria-labelledby="t-rel"><div class="section-head"><h2 id="t-rel">Mais em ' + esc(catLabel(p.cat)) + '</h2>' +
          '<a href="catalogo.html?cat=' + p.cat + '">Ver categoria</a></div><ul class="product-grid">' + related.map(cardHTML).join('') + '</ul></section>' : '') +
      '</div>';

    var qty = $('#qty');
    function readQty() {
      var n = parseInt(qty.value, 10);
      if (!n || n < 1) n = 1;
      if (n > MAX_QTY) n = MAX_QTY;
      qty.value = n;
      return n;
    }
    $('#q-minus').addEventListener('click', function () { qty.value = readQty() - 1; readQty(); });
    $('#q-plus').addEventListener('click', function () { qty.value = readQty() + 1; readQty(); });
    qty.addEventListener('change', readQty);
    $('#buy-add').addEventListener('click', function () {
      var n = readQty();
      Cart.add(p.id, n);
      toast(n + (n === 1 ? ' unidade adicionada' : ' unidades adicionadas') + ' ao carrinho.', 'carrinho.html', 'Ver carrinho');
    });
    $('#buy-now').addEventListener('click', function () {
      Cart.add(p.id, readQty());
      window.location.href = 'carrinho.html';
    });
  }

  /* ---------- Página: carrinho ---------- */
  function pageCart() {
    var box = $('#conteudo');

    function render() {
      var lines = Cart.lines();
      if (!lines.length) {
        box.innerHTML = '<div class="container"><div class="page-head"><h1>Carrinho</h1></div>' +
          '<div class="empty" style="margin-bottom:48px"><h2>Seu carrinho está vazio</h2>' +
          '<p>Escolha um produto e ele aparece aqui.</p>' +
          '<a class="btn" href="catalogo.html">Ver produtos</a></div></div>';
        return;
      }
      var sub = Cart.subtotal(), pix = sub * (1 - PIX_DISCOUNT);
      var items = lines.map(function (l) {
        var p = l.p;
        return '' +
          '<li class="cart-item">' +
            '<a class="thumb" href="produto.html?id=' + p.id + '" tabindex="-1" aria-hidden="true"><img src="' + p.img + '" alt="" width="96" height="96"></a>' +
            '<div><h3><a href="produto.html?id=' + p.id + '">' + esc(p.name) + '</a></h3>' +
              '<p class="unit">' + brl(p.price) + ' cada</p>' +
              '<div class="stepper" role="group" aria-label="Quantidade de ' + esc(p.name) + '">' +
                '<button type="button" data-dec="' + p.id + '" aria-label="Diminuir quantidade">−</button>' +
                '<input type="number" min="1" max="' + MAX_QTY + '" value="' + l.qty + '" data-qty="' + p.id + '" aria-label="Quantidade">' +
                '<button type="button" data-inc="' + p.id + '" aria-label="Aumentar quantidade">+</button>' +
              '</div></div>' +
            '<div class="side"><p class="line-total">' + brl(p.price * l.qty) + '</p>' +
              '<button class="link-btn" type="button" data-remove="' + p.id + '">Remover<span class="visually-hidden"> ' + esc(p.name) + '</span></button></div>' +
          '</li>';
      }).join('');

      box.innerHTML = '' +
        '<div class="container"><div class="page-head"><h1>Carrinho</h1></div>' +
        '<div class="cart-layout">' +
          '<ul class="cart-list">' + items + '</ul>' +
          '<aside class="summary" aria-labelledby="t-sum"><h2 id="t-sum">Resumo</h2>' +
            '<dl>' +
              '<div class="row"><dt>Subtotal (' + Cart.count() + (Cart.count() === 1 ? ' item' : ' itens') + ')</dt><dd>' + brl(sub) + '</dd></div>' +
              '<div class="row"><dt class="ok">Desconto no Pix (' + Math.round(PIX_DISCOUNT * 100) + '%)</dt><dd class="ok">− ' + brl(sub - pix) + '</dd></div>' +
              '<div class="row total"><dt>Total no Pix</dt><dd>' + brl(pix) + '</dd></div>' +
            '</dl>' +
            '<p class="note">Ou ' + brl(sub) + ' em até ' + MAX_INSTALLMENTS + 'x de ' + brl(sub / MAX_INSTALLMENTS) + ' no cartão. O frete é calculado na finalização.</p>' +
            '<button class="btn btn--block" type="button" id="checkout">Finalizar compra</button>' +
            '<a class="btn btn--ghost btn--block" href="catalogo.html">Continuar comprando</a>' +
            '<button class="link-btn" type="button" id="clear" style="margin-top:14px">Esvaziar carrinho</button>' +
          '</aside>' +
        '</div></div>' +
        '<dialog id="checkout-dialog" aria-labelledby="t-dlg"><h2 id="t-dlg">Compra de demonstração</h2>' +
          '<p>Este site é um projeto de demonstração e ainda não processa pagamentos. Nenhum pedido foi feito e nenhum dado foi enviado.</p>' +
          '<form method="dialog" style="display:flex;gap:10px;flex-wrap:wrap">' +
            '<button class="btn" value="ok">Entendi</button>' +
            '<button class="btn btn--ghost" value="clear" id="dlg-clear">Esvaziar carrinho</button>' +
          '</form></dialog>';
    }

    box.addEventListener('click', function (e) {
      var t = e.target;
      var dec = t.closest('[data-dec]'), inc = t.closest('[data-inc]'), rem = t.closest('[data-remove]');
      if (dec) { var id = dec.getAttribute('data-dec'); Cart.set(id, (Cart.read()[id] || 1) - 1); return; }
      if (inc) { var id2 = inc.getAttribute('data-inc'); Cart.set(id2, (Cart.read()[id2] || 0) + 1); return; }
      if (rem) { Cart.remove(rem.getAttribute('data-remove')); return; }
      if (t.closest('#clear')) { Cart.clear(); return; }
      if (t.closest('#checkout')) {
        var dlg = $('#checkout-dialog');
        if (dlg && dlg.showModal) dlg.showModal(); else window.alert('Compra de demonstração: nenhum pedido foi feito.');
        return;
      }
      if (t.closest('#dlg-clear')) { Cart.clear(); }
    });
    box.addEventListener('change', function (e) {
      var q = e.target.closest('[data-qty]');
      if (q) Cart.set(q.getAttribute('data-qty'), q.value);
    });

    document.addEventListener('cart:change', render);
    render();
  }

  /* ---------- Página: contato ---------- */
  function pageContact() {
    var form = $('#contact-form');
    if (!form) return;
    var status = $('#form-status');

    function setError(field, msg) {
      var err = $('#err-' + field.id);
      if (err) err.textContent = msg;
      if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    }
    function validate(field) {
      var v = field.value.trim(), msg = '';
      if (field.id === 'nome' && v.length < 2) msg = 'Informe seu nome.';
      if (field.id === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Informe um e-mail válido, como nome@exemplo.com.';
      if (field.id === 'assunto' && !v) msg = 'Escolha um assunto.';
      if (field.id === 'mensagem' && v.length < 10) msg = 'Escreva uma mensagem com pelo menos 10 caracteres.';
      setError(field, msg);
      return !msg;
    }
    var fields = $all('#nome, #email, #assunto, #mensagem', form);
    fields.forEach(function (f) { f.addEventListener('blur', function () { validate(f); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form-status';
      var firstBad = null;
      fields.forEach(function (f) { if (!validate(f) && !firstBad) firstBad = f; });
      if (firstBad) {
        status.textContent = 'Corrija os campos destacados e envie de novo.';
        firstBad.focus();
        return;
      }
      var body = 'Nome: ' + $('#nome').value.trim() + '\nE-mail: ' + $('#email').value.trim() + '\n\n' + $('#mensagem').value.trim();
      window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent($('#assunto').value) + '&body=' + encodeURIComponent(body);
      status.className = 'form-status ok';
      status.textContent = 'Abrimos o seu aplicativo de e-mail com a mensagem pronta. Se nada abriu, escreva para ' + EMAIL + '.';
    });
  }

  /* ---------- Inicialização ---------- */
  function init() {
    var page = document.body.getAttribute('data-page');
    var activeCat = null, activePage = page;

    if (page === 'catalogo') {
      activeCat = param('cat');
      if (!CATS.some(function (c) { return c.slug === activeCat; })) activeCat = 'todos';
    }
    if (page === 'produto') {
      var prod = byId(param('id') || '');
      if (prod) activeCat = prod.cat;
    }

    $('#site-header').outerHTML = renderHeader(activeCat, activePage);
    $('#site-footer').outerHTML = renderFooter();
    initMenu();
    initNewsletter();
    initAddButtons();
    updateCartBadge();
    document.addEventListener('cart:change', updateCartBadge);
    window.addEventListener('storage', updateCartBadge); // outra aba alterou o carrinho

    if (page === 'home') pageHome();
    if (page === 'catalogo') pageCatalog();
    if (page === 'produto') pageProduct();
    if (page === 'carrinho') pageCart();
    if (page === 'contato') pageContact();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
