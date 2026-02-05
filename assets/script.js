/* ========================================
   Nongor Brand - Core Interaction Script
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Cinematic Loading Overlay Dismissal
    // ======================================
    const overlay = document.getElementById('app-loading-overlay');

    if (overlay) {
        // Wait for window load to ensure all assets (images/fonts) are ready
        window.addEventListener('load', () => {
            // Minimum show time buffer
            setTimeout(() => {
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';

                // Remove from DOM after transition
                setTimeout(() => {
                    overlay.remove();
                }, 1000); // Matches CSS transition duration
            }, 800);
        });

        // Fallback: Force remove after 5 seconds if window.load hangs
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
                setTimeout(() => overlay.remove(), 1000);
            }
        }, 5000);
    }

    // 2. Navbar Scroll Effect (Glassmorphism)
    // =======================================
    const navbar = document.getElementById('navbar');

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                // Scrolled State
                navbar.classList.add('bg-white/90', 'shadow-md');
                navbar.classList.remove('bg-white/80', 'border-white/20');
            } else {
                // Top State
                navbar.classList.add('bg-white/80', 'border-white/20');
                navbar.classList.remove('bg-white/90', 'shadow-md');
            }
        });
    }

    // 3. Mobile Menu Toggle
    // =====================
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // 4. Smooth Scroll for Anchor Links
    // =================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
            }
        });
    });

    // 5. Intersection Observer for Fade-In Animations
    // ===============================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                entry.target.style.opacity = '1';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });

});
