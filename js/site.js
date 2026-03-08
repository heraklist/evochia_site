(function () {
  'use strict';

  /* ── Load deferred CSS (CookieConsent, non-render-blocking) ── */
  ['/css/cookieconsent.css', '/css/cookieconsent-evochia.css'].forEach(function (href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });

  /* ── Remove no-js class (enables CSS animations) ── */
  document.documentElement.classList.remove('no-js');

  /* ── Element refs (all defensive) ── */
  var nav = document.getElementById('nav');
  var ham = document.getElementById('hamburger');
  var nLinks = document.getElementById('navLinks');
  var ls = document.getElementById('langSwitch');
  var conc = document.getElementById('conciergerie');
  var concBtn = document.getElementById('conciergerieToggle');

  /* GA4 helper */
  function gaEvent(name, params) {
    if (typeof gtag !== 'function') return;
    var payload = params && typeof params === 'object' ? params : {};
    if (!payload.page_path) payload.page_path = window.location.pathname;
    if (window.__GA_DEBUG__ === true) payload.debug_mode = true;
    gtag('event', name, payload);
  }

  /* ── Nav visible ── */
  if (nav) nav.classList.add('visible');

  /* ── Scroll — nav background ── */
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  /* ── Mobile menu ── */
  function closeMenu() {
    if (ham) ham.setAttribute('aria-expanded', 'false');
    if (nLinks) nLinks.classList.remove('mobile-open');
  }
  function openMenu() {
    if (ham) ham.setAttribute('aria-expanded', 'true');
    if (nLinks) nLinks.classList.add('mobile-open');
  }

  if (ham) {
    ham.addEventListener('click', function () {
      nLinks && nLinks.classList.contains('mobile-open') ? closeMenu() : openMenu();
    });
  }
  if (nLinks) {
    nLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  /* ── Conciergerie helpers ── */
  function closeConciergerie() {
    if (conc) conc.classList.remove('open');
    if (concBtn) concBtn.setAttribute('aria-expanded', 'false');
  }

  /* ── Escape key — close menus ── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeMenu();
      closeConciergerie();
    }
  });

  /* ── Click outside mobile menu ── */
  document.addEventListener('click', function (e) {
    if (nLinks && nLinks.classList.contains('mobile-open') &&
        !nLinks.contains(e.target) && ham && !ham.contains(e.target)) {
      closeMenu();
    }
  });

  /* ── Language toggle ── */
  var staticLocaleMatch = window.location.pathname.match(/^\/(en|el)(?:\/|$)/);
  var isStaticLocalized = !!staticLocaleMatch;
  var lang = isStaticLocalized ? staticLocaleMatch[1] : (document.documentElement.lang || 'en');

  function getStaticLocalePath(targetLang) {
    var path = window.location.pathname || '/';
    var normalized = path
      .replace(/\/index\.html$/i, '/')
      .replace(/\.html$/i, '/');

    if (!normalized.endsWith('/')) normalized += '/';

    var localizedMatch = normalized.match(/^\/(en|el)(\/.*)?$/);
    if (localizedMatch) {
      return '/' + targetLang + (localizedMatch[2] || '/');
    }

    var legacyMap = {
      '/': '/',
      '/index/': '/',
      '/about/': '/about/',
      '/catering/': '/catering/',
      '/private-chef/': '/private-chef/',
      '/menus/': '/menus/',
      '/contact/': '/contact/',
      '/privacy/': '/privacy/',
      '/404/': '/404/'
    };

    return '/' + targetLang + (legacyMap[normalized] || '/');
  }

  function switchToStaticLocale(targetLang) {
    var targetPath = getStaticLocalePath(targetLang);
    if (window.location.pathname !== targetPath) {
      window.location.href = targetPath;
      return true;
    }
    return false;
  }

  /* 12A: Restore saved language preference only on legacy root pages */
  var savedLang = null;
  if (!isStaticLocalized) {
    savedLang = localStorage.getItem('evochia-lang');
    if (savedLang && savedLang !== lang) {
      lang = savedLang;
      document.documentElement.lang = lang;
    }
  }

  function applyLanguage() {
    document.querySelectorAll('[data-' + lang + ']').forEach(function (el) {
      if (el.hasAttribute('data-' + lang + '-html')) return;
      var t = el.getAttribute('data-' + lang);
      if (t) el.textContent = t;
    });
    document.querySelectorAll('[data-' + lang + '-html]').forEach(function (el) {
      var t = el.getAttribute('data-' + lang + '-html');
      if (!t) return;
      // Allow only the small inline tags used in localized headings.
      var allowed = t.replace(/<(?!\/?(?:em|span)(?:\s[^>]*)?>)[^>]+>/gi, '');
      // Strip any event-handler attributes from the remaining allowed tags.
      allowed = allowed.replace(/(<(?:em|span)\b[^>]*?)\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)([^>]*>)/gi, '$1$2');
      el.innerHTML = allowed;
    });
    /* Toggle language-specific hidden blocks (privacy page) */
    document.querySelectorAll('[data-en-hidden],[data-el-hidden]').forEach(function (el) {
      el.hidden = el.hasAttribute('data-' + lang + '-hidden');
    });
  }

  if (ls) {
    ls.addEventListener('click', function () {
      var nextLang = lang === 'en' ? 'el' : 'en';

      if (switchToStaticLocale(nextLang)) return;
      if (isStaticLocalized) return;

      lang = nextLang;
      ls.textContent = lang === 'en' ? 'EL' : 'EN';
      ls.setAttribute('aria-label', lang === 'en' ? 'Αλλαγή σε Ελληνικά' : 'Switch to English');
      document.documentElement.lang = lang;
      localStorage.setItem('evochia-lang', lang);
      applyLanguage();
    });
  }

  /* Apply saved language on page load */
  if (!isStaticLocalized && savedLang) {
    if (ls) {
      ls.textContent = lang === 'en' ? 'EL' : 'EN';
      ls.setAttribute('aria-label', lang === 'en' ? 'Αλλαγή σε Ελληνικά' : 'Switch to English');
    }
    applyLanguage();
  }

  /* ── Service tabs (homepage) ── */
  var tabs = document.querySelectorAll('.services-tab');
  if (tabs.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.service-panel').forEach(function (p) {
          p.classList.remove('active');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        var panel = document.getElementById('panel-' + tab.dataset.tab);
        if (panel) panel.classList.add('active');
      });

      /* Keyboard arrow navigation between tabs */
      tab.addEventListener('keydown', function (e) {
        var arr = Array.from(tabs);
        var idx = arr.indexOf(tab);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var next = e.key === 'ArrowRight'
            ? arr[(idx + 1) % arr.length]
            : arr[(idx - 1 + arr.length) % arr.length];
          next.click();
          next.focus();
        }
      });
    });
  }

  /* ── Conciergerie panel ── */
  if (concBtn && conc) {
    concBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      conc.classList.toggle('open');
      var isOpen = conc.classList.contains('open');
      concBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!conc.contains(e.target)) closeConciergerie();
    });
  }

  /* ── Scroll reveal (IntersectionObserver) ── */
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
  }

  /* ── Smooth scroll for anchor links (respects reduced-motion) ── */
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        closeMenu();
      }
    });
  });

  /* ── Contact form submit ── */
  /* GA4 click tracking: contact actions and CTA clicks */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!el) return;

    var href = '';
    if (el.tagName === 'A') href = el.getAttribute('href') || '';
    if (href.indexOf('#') === 0) return;

    var linkText = (el.textContent || '').trim().replace(/\s+/g, ' ');
    var normalizedHref = href.toLowerCase();

    if (normalizedHref.indexOf('tel:') === 0) {
      gaEvent('contact_click', {
        method: 'phone',
        link_url: href,
        link_text: linkText,
        lead_source: 'site'
      });
      return;
    }

    if (normalizedHref.indexOf('mailto:') === 0) {
      gaEvent('contact_click', {
        method: 'email',
        link_url: href,
        link_text: linkText,
        lead_source: 'site'
      });
      return;
    }

    if (normalizedHref.indexOf('wa.me/') !== -1) {
      gaEvent('contact_click', {
        method: 'whatsapp',
        link_url: href,
        link_text: linkText,
        lead_source: 'site'
      });
      return;
    }

    var ctaVariant = '';
    if (el.classList.contains('btn-primary')) {
      ctaVariant = 'primary';
    } else if (el.classList.contains('btn-secondary')) {
      ctaVariant = 'secondary';
    } else if (el.classList.contains('text-link')) {
      ctaVariant = 'text';
    }

    if (ctaVariant) {
      gaEvent('cta_click', {
        cta_variant: ctaVariant,
        link_url: href,
        link_text: linkText,
        lead_source: 'site'
      });
    }
  });

  var quoteForm = document.getElementById('quoteForm');
  if (quoteForm) {
    quoteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      gaEvent('form_submit_attempt', {
        form_id: 'quoteForm',
        lead_source: 'quote_form'
      });
      var btn = quoteForm.querySelector('button[type="submit"]');
      var status = document.getElementById('form-status');
      var origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '...';
      if (status) status.hidden = true;

      fetch(quoteForm.action, {
        method: 'POST',
        body: new FormData(quoteForm),
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        if (res.ok) {
          var eventTypeEl = document.getElementById('qf-event');
          var eventType = eventTypeEl ? eventTypeEl.value : '';
          var isEl = document.documentElement.lang === 'el';
          if (status) {
            status.textContent = isEl
              ? 'Ευχαριστούμε! Θα επικοινωνήσουμε σύντομα.'
              : 'Thank you! We\'ll be in touch soon.';
            status.className = 'form-status success';
            status.hidden = false;
          }
          gaEvent('generate_lead', {
            lead_source: 'quote_form',
            event_type: eventType || '',
            form_id: 'quoteForm'
          });
          quoteForm.reset();
        } else {
          throw new Error('Server error');
        }
      }).catch(function () {
        var isEl = document.documentElement.lang === 'el';
        if (status) {
          status.textContent = isEl
            ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά ή στείλτε email.'
            : 'Something went wrong. Please try again or email us.';
          status.className = 'form-status error';
          status.hidden = false;
        }
      }).finally(function () {
        btn.disabled = false;
        btn.textContent = origText;
      });
    });
  }

  /* ── Dynamic copyright year ── */
  var yearEl = document.getElementById('copyright-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Cookie preference buttons (CSP-safe delegation) ── */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.cc-show-prefs, .policy-cookie-btn')) {
      if (typeof CookieConsent !== 'undefined') CookieConsent.showPreferences();
    }
  });

})();
