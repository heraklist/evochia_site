import '/js/cookieconsent.umd.js';

var isMobileConsent = !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

var localizedPrefix = (function () {
  var match = window.location.pathname.match(/^\/(en|el)(?:\/|$)/);
  return match ? '/' + match[1] : '/en';
})();

var privacyPath = localizedPrefix + '/privacy/';
var contactPath = localizedPrefix + '/contact/';
var consentModalDescriptions = {
  en: isMobileConsent ? '' : 'Analytics cookies only with your consent. <a href="' + privacyPath + '">Privacy Policy</a>',
  el: isMobileConsent ? '' : '\u0391\u03BD\u03AC\u03BB\u03C5\u03C3\u03B7 cookies \u03BC\u03CC\u03BD\u03BF \u03BC\u03B5 \u03C4\u03B7 \u03C3\u03C5\u03B3\u03BA\u03B1\u03C4\u03AC\u03B8\u03B5\u03C3\u03AE \u03C3\u03B1\u03C2. <a href="' + privacyPath + '">\u03A0\u03BF\u03BB\u03B9\u03C4\u03B9\u03BA\u03AE \u0391\u03C0\u03BF\u03C1\u03C1\u03AE\u03C4\u03BF\u03C5</a>'
};

function initializeGtagStub() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { dataLayer.push(arguments); };
  }
}

function applyDefaultConsent() {
  initializeGtagStub();
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied'
  });
}

function ensureCookieConsentStyles() {
  if (window.__EVOCHIA_COOKIECONSENT_STYLES_PROMISE__) {
    return window.__EVOCHIA_COOKIECONSENT_STYLES_PROMISE__;
  }

  var hrefs = ['/css/cookieconsent.css', '/css/cookieconsent-evochia.css'];
  var pending = hrefs.map(function (href) {
    var existing = document.querySelector('link[href="' + href + '"]');
    if (existing) {
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
      document.head.appendChild(link);
    });
  });

  window.__EVOCHIA_COOKIECONSENT_STYLES_PROMISE__ = Promise.all(pending);
  return window.__EVOCHIA_COOKIECONSENT_STYLES_PROMISE__;
}

async function bootCookieConsent() {
  if (window.__EVOCHIA_COOKIECONSENT_BOOTED__) return;
  window.__EVOCHIA_COOKIECONSENT_BOOTED__ = true;
  await ensureCookieConsentStyles();
  CookieConsent.run({
  cookie: {
    expiresAfterDays: 182
  },

  guiOptions: {
    consentModal: {
      layout: 'box inline',
      position: 'bottom left'
    },
    preferencesModal: {
      layout: 'box'
    }
  },

  categories: {
    necessary: {
      enabled: true,
      readOnly: true
    },
    analytics: {
      autoClear: {
        cookies: [
          { name: /^_ga/ },
          { name: '_gid' }
        ]
      }
    }
  },

  language: {
    default: 'en',
    autoDetect: 'document',
    translations: {
      en: {
        consentModal: {
          title: isMobileConsent ? 'Cookies & analytics' : 'We use cookies',
          description: consentModalDescriptions.en,
          acceptAllBtn: isMobileConsent ? 'Accept' : 'Accept all',
          acceptNecessaryBtn: isMobileConsent ? 'Reject' : 'Reject all',
          showPreferencesBtn: isMobileConsent ? 'Privacy & settings' : 'Manage preferences'
        },
        preferencesModal: {
          title: 'Cookie Preferences',
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Reject all',
          savePreferencesBtn: 'Save preferences',
          sections: [
            {
              title: 'Strictly Necessary',
              description: 'These cookies are essential for the website to function and cannot be disabled.',
              linkedCategory: 'necessary'
            },
            {
              title: 'Analytics',
              description: 'We use Google Analytics to understand how visitors interact with our website. These cookies collect information anonymously.',
              linkedCategory: 'analytics'
            },
            {
              title: 'More information',
              description: 'See our <a href="' + privacyPath + '">Privacy Policy</a> or <a href="' + contactPath + '">contact us</a>.'
            }
          ]
        }
      },
      el: {
        consentModal: {
          title: isMobileConsent ? '\u0043\u006f\u006f\u006b\u0069\u0065\u0073 & \u03b1\u03bd\u03ac\u03bb\u03c5\u03c3\u03b7' : 'Χρησιμοποιούμε cookies',
          description: consentModalDescriptions.el,
          acceptAllBtn: isMobileConsent ? '\u0391\u03c0\u03bf\u03b4\u03bf\u03c7\u03ae' : 'Αποδοχή όλων',
          acceptNecessaryBtn: isMobileConsent ? '\u0391\u03c0\u03cc\u03c1\u03c1\u03b9\u03c8\u03b7' : 'Απόρριψη όλων',
          showPreferencesBtn: isMobileConsent ? '\u03a1\u03c5\u03b8\u03bc\u03af\u03c3\u03b5\u03b9\u03c2' : 'Διαχείριση προτιμήσεων'
        },
        preferencesModal: {
          title: 'Προτιμήσεις Cookies',
          acceptAllBtn: 'Αποδοχή όλων',
          acceptNecessaryBtn: 'Απόρριψη όλων',
          savePreferencesBtn: 'Αποθήκευση προτιμήσεων',
          sections: [
            {
              title: 'Απολύτως Απαραίτητα',
              description: 'Αυτά τα cookies είναι απαραίτητα για τη λειτουργία του ιστότοπου και δεν μπορούν να απενεργοποιηθούν.',
              linkedCategory: 'necessary'
            },
            {
              title: 'Ανάλυση Επισκεψιμότητας',
              description: 'Χρησιμοποιούμε το Google Analytics για να κατανοήσουμε πώς αλληλεπιδρούν οι επισκέπτες με τον ιστότοπό μας. Αυτά τα cookies συλλέγουν ανώνυμα στοιχεία.',
              linkedCategory: 'analytics'
            },
            {
              title: 'Περισσότερες πληροφορίες',
              description: '\u0394\u03b5\u03af\u03c4\u03b5 \u03c4\u03b7\u03bd <a href="' + privacyPath + '">\u03a0\u03bf\u03bb\u03b9\u03c4\u03b9\u03ba\u03ae \u0391\u03c0\u03bf\u03c1\u03c1\u03ae\u03c4\u03bf\u03c5</a> \u03ae <a href="' + contactPath + '">\u03b5\u03c0\u03b9\u03ba\u03bf\u03b9\u03bd\u03c9\u03bd\u03ae\u03c3\u03c4\u03b5 \u03bc\u03b1\u03b6\u03af \u03bc\u03b1\u03c2</a>.'
            }
          ]
        }
      }
    }
  },

  onFirstConsent: function () {
    updateGtagConsent();
  },

  onConsent: function () {
    updateGtagConsent();
  },

  onChange: function ({ changedCategories }) {
    updateGtagConsent();
    if (changedCategories.indexOf('analytics') > -1 && !CookieConsent.acceptedCategory('analytics')) {
      window.location.reload();
    }
  }
  });
}

function scheduleCookieConsentBoot() {
  var run = function () {
    var bootDelay = isMobileConsent ? 1800 : 0;
    window.setTimeout(function () {
      if ('requestAnimationFrame' in window) {
        window.requestAnimationFrame(function () {
          window.setTimeout(bootCookieConsent, 0);
        });
        return;
      }

      window.setTimeout(bootCookieConsent, 0);
    }, bootDelay);
  };

  if (document.readyState !== 'loading') {
    run();
    return;
  }

  document.addEventListener('DOMContentLoaded', run, { once: true });
}

applyDefaultConsent();
scheduleCookieConsentBoot();

function updateGtagConsent() {
  var accepted = CookieConsent.acceptedCategory('analytics');
  if (accepted) ensureAnalyticsScript();
  if (typeof gtag === 'function') {
    gtag('consent', 'update', {
      'analytics_storage': accepted ? 'granted' : 'denied'
    });
  }
}

function ensureAnalyticsScript() {
  if (window.__EVOCHIA_GA4_LOADED__ || document.querySelector('script[data-ga4]')) return;
  var s = document.createElement('script');
  s.async = true;
  s.dataset.ga4 = '1';
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-DERZSDHHF1';
  document.head.appendChild(s);
  window.__EVOCHIA_GA4_LOADED__ = true;
  gtag('js', new Date());
  gtag('config', 'G-DERZSDHHF1', {
    language: document.documentElement.lang || 'en',
    page_path: window.location.pathname,
    page_title: document.title
  });
}

