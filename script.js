/* ============================================
   KHAIRO TOURS & TRAVELS - Agent Website
   Interactive JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ========== Preferensi Gerak ==========
    // CSS sudah mematikan animasinya, tapi motion yang dijalankan JS
    // (parallax, smooth scroll, tilt) harus dimatikan sendiri di sini.
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = () => motionQuery.matches;

    // ========== Page Loader ==========
    const loader = document.getElementById('pageLoader');
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (loader) loader.classList.add('hidden');
        }, 800);
    });

    // ========== Navbar Scroll Effect ==========
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('backToTop');

    const handleScroll = () => {
        const scrollY = window.scrollY;

        // Navbar background
        if (navbar) {
            if (scrollY > 60) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        // Back to top visibility
        if (backToTop) {
            if (scrollY > 500) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }

        // Active nav link based on section
        updateActiveNavLink();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ========== Active Nav Link ==========
    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-links a:not(.nav-cta)');
        const scrollPos = window.scrollY + 150;

        let activeSectionId = null;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                activeSectionId = sectionId;
            }
        });

        if (!activeSectionId) return;

        const hasMatchingLink = Array.from(navLinks).some(link =>
            link.getAttribute('href') === `#${activeSectionId}`
        );

        if (!hasMatchingLink) return;

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${activeSectionId}`) {
                link.classList.add('active');
            }
        });
    }

    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    function closeMenu() {
        if (!menuToggle || !navLinks) return;
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
    }

    if (menuToggle && navLinks) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.addEventListener('click', () => {
            const isOpen = menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuToggle.classList.contains('active')) {
                closeMenu();
                menuToggle.focus();
            }
        });
    }

    // ========== Back to Top ==========
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        });
    }

    // ========== Scroll Reveal Animations ==========
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('active'));
    }

    // ========== Counter Animation ==========
    // Angka tetap dihitung (memang data), tapi tanpa menghitung naik
    // bila pengguna meminta reduced motion — nilai akhir langsung tampil.
    const counters = document.querySelectorAll('.counter-animate');

    const showFinalValue = (counter) => {
        counter.textContent = parseInt(counter.getAttribute('data-target'), 10).toLocaleString('id-ID');
    };

    if (prefersReducedMotion()) {
        counters.forEach(showFinalValue);
    } else if ('IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    animateCounter(counter, parseInt(counter.getAttribute('data-target'), 10));
                    counterObserver.unobserve(counter);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => counterObserver.observe(counter));
    } else {
        counters.forEach(showFinalValue);
    }

    function animateCounter(element, target) {
        let current = 0;
        const increment = target / 60;
        const duration = 2000;
        const stepTime = duration / 60;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current).toLocaleString('id-ID');
        }, stepTime);
    }

    // ========== Hero Particles ==========
    const particlesContainer = document.getElementById('heroParticles');
    if (particlesContainer && !prefersReducedMotion()) {
        createParticles();
    }

    function createParticles() {
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (Math.random() * 4 + 6) + 's';
            particle.style.width = (Math.random() * 4 + 2) + 'px';
            particle.style.height = particle.style.width;
            particle.style.opacity = Math.random() * 0.5 + 0.1;
            particlesContainer.appendChild(particle);
        }
    }

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');
    const galleryItems = document.querySelectorAll('.gallery-item');
    let lastFocusedElement = null;

    function openModal(img, trigger) {
        if (!lightbox || !lightboxImg || !img) return;
        lastFocusedElement = trigger || document.activeElement;
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || '';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (lightboxClose) lightboxClose.focus();
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        }
    }

    window.openLightbox = (img, trigger) => {
        openModal(img, trigger);
    };

    const setupInteractiveTarget = (el, getImg) => {
        if (!el) return;
        // <button> asli sudah bisa difokuskan dan diaktifkan Enter/Space,
        // jadi tidak perlu tabindex/role manual. Elemen lain tetap butuh.
        const isNativeButton = el.tagName === 'BUTTON' || el.tagName === 'A';
        if (!isNativeButton) {
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
        }
        const trigger = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            const img = getImg(el);
            if (img) openModal(img, el);
        };
        el.addEventListener('click', trigger);
        el.addEventListener('keydown', (e) => {
            if (isNativeButton) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                trigger(e);
            }
        });
    };

    galleryItems.forEach(item => {
        setupInteractiveTarget(item, (el) => el.querySelector('img'));
    });

    const serviceImgs = document.querySelectorAll('.service-img');
    serviceImgs.forEach(serviceImg => {
        setupInteractiveTarget(serviceImg, (el) => el.querySelector('img'));
    });

    document.querySelectorAll('.agent-id-card').forEach(card => {
        setupInteractiveTarget(card, (el) => el.querySelector('img'));
    });

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
        lightbox.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                if (lightboxClose) lightboxClose.focus();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    // ========== Smooth Scroll for Anchor Links ==========
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navHeight = navbar ? navbar.offsetHeight : 0;
                const targetPosition = targetElement.offsetTop - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: prefersReducedMotion() ? 'auto' : 'smooth'
                });
            }
        });
    });

    // ========== Parallax on Hero ==========
    // better-accessibility: under reduced motion, kill parallax entirely.
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg && !prefersReducedMotion()) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            if (scrollY < window.innerHeight) {
                heroBg.style.transform = `translateY(${scrollY * 0.3}px)`;
            }
        }, { passive: true });
    }

    // ========== Package Card Tilt Effect ==========
    // Dikenakan lewat custom property, bukan inline transform, supaya
    // .package-card:hover (translateY) tidak kalah oleh inline style.
    if (!prefersReducedMotion()) {
        const packageCards = document.querySelectorAll('.package-card');

        packageCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const rotateX = (y - rect.height / 2) / 20;
                const rotateY = (rect.width / 2 - x) / 20;

                card.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
                card.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
            });

            card.addEventListener('mouseleave', () => {
                card.style.setProperty('--tilt-x', '0deg');
                card.style.setProperty('--tilt-y', '0deg');
            });
        });
    }

    // ========== Typing Effect on Hero Badge ==========
    const heroBadge = document.querySelector('.hero-badge');
    if (heroBadge) {
        const originalText = heroBadge.innerHTML;
        heroBadge.style.opacity = '0';
        setTimeout(() => {
            heroBadge.style.opacity = '1';
        }, 300);
    }

    // ========== Service Cards Stagger Animation ==========
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
    });

});
