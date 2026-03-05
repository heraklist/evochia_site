import '/js/cookieconsent.umd.js';

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
          description: 'We use cookies to analyse site traffic via Google Analytics. No personal data is shared with third parties. You can change your preferences at any time. <a href="/privacy">Privacy Policy</a>',
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
              description: 'For questions about our cookie policy, please <a href="/contact">contact us</a>.'
            }
          ]
        }
      },
      el: {
        consentModal: {
          title: 'Χρησιμοποιούμε cookies',
          description: 'Χρησιμοποιούμε cookies για ανάλυση επισκεψιμότητας μέσω Google Analytics. Κανένα προσωπικό δεδομένο δεν κοινοποιείται σε τρίτους. Μπορείτε να αλλάξετε τις προτιμήσεις σας ανά πάσα στιγμή. <a href="/privacy">Πολιτική Απορρήτου</a>',
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
              description: 'Για ερωτήσεις σχετικά με την πολιτική cookies, <a href="/contact">επικοινωνήστε μαζί μας</a>.'
            }
          ]
        }
      }
    }
  },

  onFirstConsent: function ({ cookie }) {
    updateGtagConsent(cookie);
  },

  onConsent: function ({ cookie }) {
    updateGtagConsent(cookie);
  },

  onChange: function ({ cookie, changedCategories }) {
    updateGtagConsent(cookie);
    if (changedCategories.indexOf('analytics') > -1 && !CookieConsent.acceptedCategory('analytics')) {
      window.location.reload();
    }
  }
});

function updateGtagConsent(cookie) {
  if (typeof gtag !== 'function') return;
  var accepted = CookieConsent.acceptedCategory('analytics');
  gtag('consent', 'update', {
    'analytics_storage': accepted ? 'granted' : 'denied'
  });
}
