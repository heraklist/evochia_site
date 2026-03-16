(function () {
  'use strict';

  /* Promote the preloaded main stylesheet after parse */
  function loadMainStylesheet() {
    var promote = function () {
      var preload = document.getElementById('siteStylesPreload');
      if (!preload) return;
      preload.rel = 'stylesheet';
      preload.removeAttribute('as');
      preload.id = 'siteStylesheet';
    };
    promote();
  }

  loadMainStylesheet();

  /* Remove no-js class (enables CSS animations) */
  document.documentElement.classList.remove('no-js');

  /* Element refs (all defensive) */
  var nav = document.getElementById('nav');
  var ham = document.getElementById('hamburger');
  var nLinks = document.getElementById('navLinks');
  var ls = document.getElementById('langSwitch');
  var conc = document.getElementById('conciergerie');
  var concBtn = document.getElementById('conciergerieToggle');

  function getPageType(pathname) {
    var route = pathname.replace(/^\/(en|el)/, '') || '/';
    if (route === '/' || route === '') return 'home';
    if (route.indexOf('/wedding-catering/') === 0) return 'wedding_catering';
    if (route.indexOf('/corporate-catering/') === 0) return 'corporate_catering';
    if (route.indexOf('/villa-private-chef/') === 0) return 'villa_private_chef';
    if (route.indexOf('/yacht-private-chef/') === 0) return 'yacht_private_chef';
    if (route.indexOf('/athens-private-chef/') === 0) return 'athens_private_chef';
    if (route.indexOf('/greek-islands-private-chef/') === 0) return 'greek_islands_private_chef';
    if (route.indexOf('/private-chef/') === 0) return 'private_chef';
    if (route.indexOf('/catering/') === 0) return 'catering';
    if (route.indexOf('/menus/') === 0) return 'menus';
    if (route.indexOf('/contact/') === 0) return 'contact';
    if (route.indexOf('/about/') === 0) return 'about';
    if (route.indexOf('/privacy/') === 0) return 'privacy';
    if (route.indexOf('/faq/') === 0) return 'faq';
    if (route.indexOf('/lookbook/') === 0) return 'lookbook';
    if (route.indexOf('/404') === 0) return 'not_found';
    return 'other';
  }

  function getServiceIntent(pageType) {
    if (pageType === 'catering' || pageType === 'wedding_catering' || pageType === 'corporate_catering') return 'event_catering';
    if (pageType === 'private_chef' || pageType === 'villa_private_chef' || pageType === 'yacht_private_chef' || pageType === 'athens_private_chef' || pageType === 'greek_islands_private_chef') return 'private_chef';
    if (pageType === 'menus') return 'menu_inquiry';
    if (pageType === 'contact') return 'lead_capture';
    if (pageType === 'home') return 'mixed_services';
    return 'general';
  }

  /* GA4 helper */
  function gaEvent(name, params) {
    if (typeof gtag !== 'function') return;
    var payload = params && typeof params === 'object' ? Object.assign({}, params) : {};
    var currentPath = window.location.pathname;
    var pageType = getPageType(currentPath);
    if (!payload.page_path) payload.page_path = currentPath;
    if (!payload.locale) payload.locale = lang;
    if (!payload.page_type) payload.page_type = pageType;
    if (!payload.service_intent) payload.service_intent = getServiceIntent(pageType);
    if (window.__GA_DEBUG__ === true) payload.debug_mode = true;
    gtag('event', name, payload);
  }

  /* Nav visible */
  if (nav) nav.classList.add('visible');

  /* Scroll - nav background */
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  /* Mobile menu */
  function closeMenu(options) {
    var wasOpen = !!(nLinks && nLinks.classList.contains('mobile-open'));
    var restoreFocus = !!(options && options.restoreFocus);
    if (ham) ham.setAttribute('aria-expanded', 'false');
    if (nLinks) nLinks.classList.remove('mobile-open');
    document.body.classList.remove('menu-open');
    if (restoreFocus && wasOpen && ham) ham.focus();
  }
  function openMenu() {
    if (ham) ham.setAttribute('aria-expanded', 'true');
    if (nLinks) nLinks.classList.add('mobile-open');
    document.body.classList.add('menu-open');
    /* Move focus to first interactive item */
    if (nLinks) {
      var firstLink = nLinks.querySelector('a, button');
      if (firstLink) firstLink.focus();
    }
  }

  /* Focus trap inside mobile menu */
  if (nLinks) {
    nLinks.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !nLinks.classList.contains('mobile-open')) return;
      var focusable = nLinks.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  if (ham) {
    ham.addEventListener('click', function (e) {
      e.stopPropagation();
      nLinks && nLinks.classList.contains('mobile-open')
        ? closeMenu({ restoreFocus: false })
        : openMenu();
    });
  }
  if (nLinks) {
    nLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  /* Conciergerie helpers */
  function closeConciergerie(options) {
    var wasOpen = !!(conc && conc.classList.contains('open'));
    var restoreFocus = !!(options && options.restoreFocus);
    if (conc) conc.classList.remove('open');
    if (concBtn) concBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus && wasOpen && concBtn) concBtn.focus();
  }

  /* Escape key - close menus */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeMenu({ restoreFocus: true });
      closeConciergerie({ restoreFocus: true });
    }
  });

  /* Click outside mobile menu */
  document.addEventListener('click', function (e) {
    if (nLinks && nLinks.classList.contains('mobile-open') &&
        !nLinks.contains(e.target) && ham && !ham.contains(e.target)) {
      closeMenu();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) closeMenu();
  });

  /* Language toggle */
  var staticLocaleMatch = window.location.pathname.match(/^\/(en|el)(?:\/|$)/);
  var isStaticLocalized = !!staticLocaleMatch;
  var lang = isStaticLocalized ? staticLocaleMatch[1] : (document.documentElement.lang || 'en');

  /* 12A: Restore saved language preference only on legacy root pages */
  var savedLang = null;
  if (!isStaticLocalized) {
    try { savedLang = localStorage.getItem('evochia-lang'); } catch { /* private browsing */ }
    if ((savedLang === 'en' || savedLang === 'el') && savedLang !== lang) {
      lang = savedLang;
      document.documentElement.lang = lang;
    }
  }

  function applyLocalizedAttribute(suffix, targetAttr) {
    document.querySelectorAll('[data-' + lang + '-' + suffix + ']').forEach(function (el) {
      var value = el.getAttribute('data-' + lang + '-' + suffix);
      if (value) el.setAttribute(targetAttr || suffix, value);
    });
  }

  function applyLanguage() {
    document.documentElement.lang = lang;
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
      // Remove inline on* attributes on the remaining allowed tags.
      allowed = allowed.replace(/(<(?:em|span)\b[^>]*?)\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)([^>]*>)/gi, '$1$2');
      el.innerHTML = allowed;
    });
    applyLocalizedAttribute('href');
    applyLocalizedAttribute('aria-label', 'aria-label');
    applyLocalizedAttribute('content');
    applyLocalizedAttribute('lang');
    applyLocalizedAttribute('alt');
    /* Toggle language-specific hidden blocks (privacy page) */
    document.querySelectorAll('[data-en-hidden],[data-el-hidden]').forEach(function (el) {
      el.hidden = el.hasAttribute('data-' + lang + '-hidden');
    });
  }

  function applyStaticLocalizedState() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en-hidden],[data-el-hidden]').forEach(function (el) {
      el.hidden = el.hasAttribute('data-' + lang + '-hidden');
    });
  }

  if (isStaticLocalized) {
    applyStaticLocalizedState();
  } else {
    applyLanguage();
  }

  if (ls && !isStaticLocalized) {
    if (ls.tagName !== 'A') {
      ls.textContent = lang === 'en' ? 'EL' : 'EN';
      ls.setAttribute('aria-label', lang === 'en' ? '\u0391\u03bb\u03bb\u03b1\u03b3\u03ae \u03c3\u03b5 \u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac' : 'Switch to English');
    }
    ls.addEventListener('click', function (e) {
      e.preventDefault();
      lang = lang === 'en' ? 'el' : 'en';
      if (ls.tagName !== 'A') {
        ls.textContent = lang === 'en' ? 'EL' : 'EN';
        ls.setAttribute('aria-label', lang === 'en' ? '\u0391\u03bb\u03bb\u03b1\u03b3\u03ae \u03c3\u03b5 \u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac' : 'Switch to English');
      }
      try { localStorage.setItem('evochia-lang', lang); } catch { /* private browsing */ }
      applyLanguage();
    });
  }

  /* Service tabs (homepage) */
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

  /* Conciergerie panel */
  if (concBtn && conc) {
    concBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      conc.classList.toggle('open');
      var isOpen = conc.classList.contains('open');
      concBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) {
        var firstConciergerieAction = conc.querySelector('a, button');
        if (firstConciergerieAction) firstConciergerieAction.focus();
      } else {
        concBtn.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!conc.contains(e.target)) closeConciergerie();
    });
  }

  /* Scroll reveal (IntersectionObserver) */
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

  /* Smooth scroll for anchor links (respects reduced-motion) */
  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReducedMotion = reducedMotionQuery.matches;
  var onReducedMotionChange = function (event) {
    prefersReducedMotion = event.matches;
  };
  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', onReducedMotionChange);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(onReducedMotionChange);
  }
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

  /* Contact form submit */
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
    }

    if (normalizedHref.indexOf('mailto:') === 0) {
      gaEvent('contact_click', {
        method: 'email',
        link_url: href,
        link_text: linkText,
        lead_source: 'site'
      });
    }

    if (normalizedHref.indexOf('wa.me/') !== -1) {
      gaEvent('contact_click', {
        method: 'whatsapp',
        link_url: href,
        link_text: linkText,
        lead_source: 'site'
      });
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
      var eventTypeEl = document.getElementById('qf-event');
      var eventType = eventTypeEl ? eventTypeEl.value : '';
      gaEvent('form_submit_attempt', {
        form_id: 'quoteForm',
        lead_source: 'quote_form',
        event_type: eventType || ''
      });
      var btn = quoteForm.querySelector('button[type="submit"]');
      var status = document.getElementById('form-status');
      var origText = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = '...';
      }
      if (status) {
        status.hidden = true;
        status.className = 'form-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.textContent = '';
      }

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
              ? '\u0395\u03c5\u03c7\u03b1\u03c1\u03b9\u03c3\u03c4\u03bf\u03cd\u03bc\u03b5! \u0398\u03b1 \u03b5\u03c0\u03b9\u03ba\u03bf\u03b9\u03bd\u03c9\u03bd\u03ae\u03c3\u03bf\u03c5\u03bc\u03b5 \u03c3\u03cd\u03bd\u03c4\u03bf\u03bc\u03b1.'
              : "Thank you! We'll be in touch soon.";
            status.className = 'form-status success';
            status.setAttribute('role', 'status');
            status.setAttribute('aria-live', 'polite');
            status.hidden = false;
            status.focus();
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
            ? '\u039a\u03ac\u03c4\u03b9 \u03c0\u03ae\u03b3\u03b5 \u03c3\u03c4\u03c1\u03b1\u03b2\u03ac. \u0394\u03bf\u03ba\u03b9\u03bc\u03ac\u03c3\u03c4\u03b5 \u03be\u03b1\u03bd\u03ac \u03ae \u03c3\u03c4\u03b5\u03af\u03bb\u03c4\u03b5 email.'
            : 'Something went wrong. Please try again or email us.';
          status.className = 'form-status error';
          status.setAttribute('role', 'alert');
          status.setAttribute('aria-live', 'assertive');
          status.hidden = false;
          status.focus();
        }
      }).finally(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = origText;
        }
      });
    });
  }

  /* Dynamic copyright year */
  var yearEl = document.getElementById('copyright-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Cookie preference buttons (CSP-safe delegation) */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.cc-show-prefs, .policy-cookie-btn')) {
      if (typeof CookieConsent !== 'undefined') CookieConsent.showPreferences();
    }
  });

})();
