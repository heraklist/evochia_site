(function() {
        'use strict';

        const preloader = document.getElementById('preloader');
        const preloaderLogo = document.getElementById('preloaderLogo');
        const navLogo = document.getElementById('navLogo');
        const nav = document.getElementById('nav');
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('navLinks');

        // ========== PRELOADER ==========
        // Skip on repeat visit (sessionStorage)
        if (sessionStorage.getItem('evochia-visited')) {
            preloader.classList.add('skip');
            nav.classList.add('visible');
        } else {
            // Fail-safe: force-hide preloader after 3s max
            const failSafe = setTimeout(() => {
                preloader.style.display = 'none';
                nav.classList.add('visible');
            }, 3000);

            window.addEventListener('load', () => {
                // Start rise after 1s (logo appear + tagline)
                setTimeout(() => {
                    const logoRect = preloaderLogo.getBoundingClientRect();
                    const navLogoRect = navLogo.getBoundingClientRect();
                    const dx = navLogoRect.left + navLogoRect.width/2 - (logoRect.left + logoRect.width/2);
                    const dy = navLogoRect.top + navLogoRect.height/2 - (logoRect.top + logoRect.height/2);

                    preloaderLogo.style.setProperty('--logo-dx', dx + 'px');
                    preloaderLogo.style.setProperty('--logo-dy', dy + 'px');
                    preloader.classList.add('phase-rise');

                    setTimeout(() => {
                        preloader.classList.add('phase-fade');
                        nav.classList.add('visible');
                    }, 600);

                    setTimeout(() => {
                        preloader.style.display = 'none';
                        clearTimeout(failSafe);
                    }, 1500);
                }, 1000);

                sessionStorage.setItem('evochia-visited', '1');
            });
        }

        // ========== NAVBAR SCROLL ==========
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });

        // ========== MOBILE MENU ==========
        function openMenu() {
            hamburger.classList.add('active');
            hamburger.setAttribute('aria-expanded', 'true');
            hamburger.setAttribute('aria-label', 'Close menu');
            navLinks.classList.add('mobile-open');
        }
        function closeMenu() {
            hamburger.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-label', 'Open menu');
            navLinks.classList.remove('mobile-open');
        }
        function toggleMenu() {
            navLinks.classList.contains('mobile-open') ? closeMenu() : openMenu();
        }

        hamburger.addEventListener('click', toggleMenu);

        // Close on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
                closeMenu();
                hamburger.focus();
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('mobile-open') &&
                !navLinks.contains(e.target) &&
                !hamburger.contains(e.target)) {
                closeMenu();
            }
        });

        // ========== LANGUAGE TOGGLE (XSS-safe) ==========
        let currentLang = 'en';
        const langSwitch = document.getElementById('langSwitch');

        // Whitelist: elements that need innerHTML (contain <em>, <span>)
        const htmlElements = document.querySelectorAll('[data-en-html]');
        // Safe elements: use textContent
        const textElements = document.querySelectorAll('[data-en]:not([data-en-html])');

        langSwitch.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'el' : 'en';
            langSwitch.textContent = currentLang === 'en' ? 'EL' : 'EN';
            langSwitch.setAttribute('aria-label',
                currentLang === 'en' ? 'Switch language to Greek' : 'Αλλαγή γλώσσας σε Αγγλικά'
            );
            document.documentElement.lang = currentLang;

            // Safe: textContent only
            textElements.forEach(el => {
                const t = el.getAttribute('data-' + currentLang);
                if (t) el.textContent = t;
            });

            // Whitelisted: innerHTML (only for known elements with <em>/<span>)
            htmlElements.forEach(el => {
                const t = el.getAttribute('data-' + currentLang + '-html');
                if (t) el.innerHTML = t;
            });
        });

        // ========== SCROLL REVEAL ==========
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

        // ========== SMOOTH SCROLL ==========
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                const t = document.querySelector(this.getAttribute('href'));
                if (t) {
                    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    closeMenu();
                }
            });
        });

        // ========== SERVICES TABS ==========
        function initTabs() {
            document.querySelectorAll('.tabs[data-tabs]').forEach(tabsEl => {
                const tabs = Array.from(tabsEl.querySelectorAll('[role="tab"]'));
                const panels = Array.from(tabsEl.querySelectorAll('[role="tabpanel"]'));
                if (!tabs.length || !panels.length) return;

                function activate(tab) {
                    const targetId = tab.getAttribute('aria-controls');
                    tabs.forEach(t => {
                        const selected = t === tab;
                        t.setAttribute('aria-selected', selected ? 'true' : 'false');
                        t.tabIndex = selected ? 0 : -1;
                        t.classList.toggle('is-active', selected);
                    });
                    panels.forEach(p => {
                        const isTarget = p.id === targetId;
                        p.hidden = !isTarget;
                        p.classList.toggle('is-active', isTarget);
                    });
                }

                tabs.forEach(tab => {
                    tab.addEventListener('click', () => activate(tab));
                    tab.addEventListener('keydown', (e) => {
                        const idx = tabs.indexOf(tab);
                        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                            e.preventDefault();
                            const dir = e.key === 'ArrowRight' ? 1 : -1;
                            const next = tabs[(idx + dir + tabs.length) % tabs.length];
                            next.focus();
                            activate(next);
                        }
                    });
                });

                // Ensure correct initial state
                const active = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
                activate(active);
            });
        }
        initTabs();

        // ========== CONCIERGE PANEL ==========
        function initConcierge() {
            const concierge = document.getElementById('concierge');
            const toggle = document.getElementById('conciergeToggle');
            const panel = document.getElementById('conciergePanel');
            const closeBtn = document.getElementById('conciergeClose');
            if (!concierge || !toggle || !panel) return;

            function open() {
                concierge.classList.add('is-open');
                toggle.setAttribute('aria-expanded', 'true');
                toggle.setAttribute('aria-label', 'Close concierge');
            }
            function close() {
                concierge.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-label', 'Open concierge');
            }

            toggle.addEventListener('click', () => {
                concierge.classList.contains('is-open') ? close() : open();
            });

            if (closeBtn) closeBtn.addEventListener('click', close);

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && concierge.classList.contains('is-open')) close();
            });

            document.addEventListener('click', (e) => {
                if (!concierge.classList.contains('is-open')) return;
                if (!concierge.contains(e.target)) close();
            });
        }
        initConcierge();

        // ========== QUOTE FORM (MAILTO FALLBACK) ==========
                // ========== QUOTE MODAL ==========
        function initQuoteModal() {
            const modal = document.getElementById('quoteModal');
            if (!modal) return;

            const openers = document.querySelectorAll('[data-open-quote]');
            let lastFocus = null;

            function openModal() {
                lastFocus = document.activeElement;
                modal.classList.add('is-open');
                modal.setAttribute('aria-hidden', 'false');
                document.body.classList.add('modal-open');

                const first = modal.querySelector('input, select, textarea, button');
                if (first) first.focus();
            }

            function closeModal() {
                modal.classList.remove('is-open');
                modal.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('modal-open');
                if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
            }

            openers.forEach(el => {
                el.addEventListener('click', (e) => {
                    // keep fallback navigation if JS is disabled; with JS we open modal
                    e.preventDefault();
                    openModal();
                });
            });

            modal.addEventListener('click', (e) => {
                const closeEl = e.target.closest('[data-modal-close]');
                if (closeEl) closeModal();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
            });
        }
        initQuoteModal();

        // ========== LEAD FORMS (API-first, mailto fallback) ==========
        async function postJSON(url, payload) {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return res;
        }

        function serializeForm(form) {
            const fd = new FormData(form);
            const obj = {};
            fd.forEach((v, k) => {
                obj[k] = (typeof v === 'string') ? v.trim() : v;
            });
            return obj;
        }

        function mailtoFallback(toEmail, payload, statusEl) {
            const get = (k) => (payload[k] || '').toString().trim();
            const lines = [
                `Service: ${get('service')}`,
                `Date: ${get('date')}`,
                `Guests: ${get('guests')}`,
                `Location: ${get('location')}`,
                `Name: ${get('name')}`,
                `Phone: ${get('phone')}`,
                `Email: ${get('email')}`,
                `Company: ${get('company')}`,
                '',
                'Notes:',
                get('notes')
            ].filter(Boolean);

            const subject = encodeURIComponent('Evochia — Quote Request');
            const body = encodeURIComponent(lines.join('\n'));
            window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;

            if (statusEl) {
                statusEl.textContent = (document.documentElement.lang === 'el')
                    ? 'Άνοιξε το email σου με έτοιμο μήνυμα. Αν δεν άνοιξε, στείλε μας στο info@evochia.gr.'
                    : 'Your email client opened with a pre-filled message. If it didn’t, email us at info@evochia.gr.';
            }
        }

        function initQuoteForms() {
            const toEmail = 'info@evochia.gr';
            const forms = [];

            const mainForm = document.getElementById('quoteForm');
            if (mainForm) forms.push({ form: mainForm, status: document.getElementById('quoteStatus') });

            const modalForm = document.getElementById('quoteFormModal');
            if (modalForm) forms.push({ form: modalForm, status: document.getElementById('quoteModalStatus') });

            forms.forEach(({ form, status }) => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (status) status.textContent = '';

                    const action = (form.getAttribute('action') || '').trim();
                    const payload = serializeForm(form);

                    // Honeypot support (if present)
                    if (payload['bot-field']) return;

                    // Consent check (fail fast)
                    const consent = form.querySelector('input[name="consent"]');
                    if (consent && !consent.checked) {
                        if (status) {
                            status.textContent = (document.documentElement.lang === 'el')
                                ? 'Χρειάζεται συναίνεση για να προχωρήσουμε.'
                                : 'Consent is required to proceed.';
                        }
                        return;
                    }

                    // Try API first if action points to /api/*
                    if (action && action.startsWith('/api/')) {
                        try {
                            const res = await postJSON(action, payload);
                            if (res.ok) {
                                if (status) {
                                    status.textContent = (document.documentElement.lang === 'el')
                                        ? 'Λάβαμε το αίτημά σου. Θα απαντήσουμε εντός 24 ωρών.'
                                        : 'We received your request. We’ll respond within 24 hours.';
                                }
                                form.reset();
                                return;
                            }
                            // API not configured or failed — fall back
                        } catch (_) {
                            // fall through
                        }
                    }

                    mailtoFallback(toEmail, payload, status);
                });
            });
        }
        initQuoteForms();

        function initNewsletterForm() {
            const form = document.getElementById('newsletterForm');
            if (!form) return;

            const status = document.getElementById('newsletterStatus');
            const toEmail = 'info@evochia.gr';

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (status) status.textContent = '';

                const action = (form.getAttribute('action') || '').trim();
                const payload = serializeForm(form);

                // Consent check
                const consent = form.querySelector('input[name="consent"]');
                if (consent && !consent.checked) {
                    if (status) {
                        status.textContent = (document.documentElement.lang === 'el')
                            ? 'Χρειάζεται συναίνεση για να προχωρήσουμε.'
                            : 'Consent is required to proceed.';
                    }
                    return;
                }

                if (action && action.startsWith('/api/')) {
                    try {
                        const res = await postJSON(action, payload);
                        if (res.ok) {
                            if (status) {
                                status.textContent = (document.documentElement.lang === 'el')
                                    ? 'Έγινε! Σε καταχωρήσαμε για ενημερώσεις.'
                                    : 'Done! You’re on the updates list.';
                            }
                            form.reset();
                            return;
                        }
                    } catch (_) {}
                }

                // Mailto fallback (notify you)
                const subject = encodeURIComponent('Evochia — Newsletter signup');
                const body = encodeURIComponent(`Email: ${payload.email || ''}`);
                window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;

                if (status) {
                    status.textContent = (document.documentElement.lang === 'el')
                        ? 'Άνοιξε το email σου για να επιβεβαιώσεις την εγγραφή.'
                        : 'Your email client opened to confirm the signup.';
                }
            });
        }
        initNewsletterForm();



    })();