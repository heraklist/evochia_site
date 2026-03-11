import '/js/cookieconsent.umd.js';

var localizedPrefix = (function () {
  var match = window.location.pathname.match(/^\/(en|el)(?:\/|$)/);
  return match ? '/' + match[1] : '/en';
})();

var privacyPath = localizedPrefix + '/privacy/';
var contactPath = localizedPrefix + '/contact/';

CookieConsent.run({
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
          title: 'We use cookies',
          description: 'We use cookies to analyse site traffic via Google Analytics. Analytics data is processed only with your consent, and you can change your preferences at any time. <a href="' + privacyPath + '">Privacy Policy</a>',
          acceptAllBtn: 'Accept all',
          acceptNecessaryBtn: 'Reject all',
          showPreferencesBtn: 'Manage preferences'
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
              description: 'For questions about our cookie policy, please <a href="' + contactPath + '">contact us</a>.'
            }
          ]
        }
      },
      el: {
        consentModal: {
          title: 'Χρησιμοποιούμε cookies',
          description: 'Χρησιμοποιούμε cookies για ανάλυση επισκεψιμότητας μέσω Google Analytics. Τα δεδομένα ανάλυσης επεξεργάζονται μόνο με τη συγκατάθεσή σας και μπορείτε να αλλάξετε τις προτιμήσεις σας ανά πάσα στιγμή. <a href="' + privacyPath + '">Πολιτική Απορρήτου</a>',
          acceptAllBtn: 'Αποδοχή όλων',
          acceptNecessaryBtn: 'Απόρριψη όλων',
          showPreferencesBtn: 'Διαχείριση προτιμήσεων'
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
              description: 'Για ερωτήσεις σχετικά με την πολιτική cookies, <a href="' + contactPath + '">επικοινωνήστε μαζί μας</a>.'
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
  if (window.gtag || document.querySelector('script[data-ga4]')) return;
  var s = document.createElement('script');
  s.async = true;
  s.dataset.ga4 = '1';
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-DERZSDHHF1';
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', 'G-DERZSDHHF1', {
    language: document.documentElement.lang || 'en',
    page_path: window.location.pathname,
    page_title: document.title
  });
}
