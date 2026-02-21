// ==============================================
// NAVIGATION — Navbar and mobile menu
// ==============================================

window.toggleMobileMenu = function () {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('mobile-menu-btn');
    const icon = document.getElementById('hamburger-icon');
    const spans = icon ? icon.querySelectorAll('span') : [];

    if (menu.classList.contains('translate-x-full')) {
        // Open menu
        menu.classList.remove('translate-x-full');
        document.body.style.overflow = 'hidden';

        // Animate hamburger → X
        if (spans.length === 3) {
            spans[0].style.transform = 'translateY(7px) rotate(45deg)';
            spans[0].style.width = '100%';
            spans[1].style.opacity = '0';
            spans[1].style.transform = 'scaleX(0)';
            spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
            spans[2].style.width = '100%';
        }
    } else {
        // Close menu
        menu.classList.add('translate-x-full');
        document.body.style.overflow = '';

        // Animate X → hamburger
        if (spans.length === 3) {
            spans[0].style.transform = '';
            spans[0].style.width = '';
            spans[1].style.opacity = '';
            spans[1].style.transform = '';
            spans[2].style.transform = '';
            spans[2].style.width = '';
        }
    }
};

window.initNavigation = function () {
    // Sticky Navbar Logic with Throttle
    const navbar = document.getElementById('navbar');
    let ticking = false;

    const updateNavbar = () => {
        if (!navbar) return;
        const isMobile = window.innerWidth < 768;

        if (window.scrollY > 50) {
            // Scrolled: solid white background
            navbar.classList.remove('md:bg-transparent', 'md:backdrop-blur-none');
            navbar.classList.add('bg-white/95', 'shadow-md', 'text-brand-deep', 'border-b-gray-100/50');
            navbar.classList.remove('bg-brand-deep/90', 'text-brand-light');
            if (isMobile) {
                navbar.classList.remove('py-4');
                navbar.classList.add('py-3');
            }
        } else {
            // Top: transparent/branded
            navbar.classList.add('md:bg-transparent', 'md:backdrop-blur-none');
            navbar.classList.remove('bg-white/95', 'shadow-md', 'text-brand-deep', 'border-b-gray-100/50');
            navbar.classList.add('bg-brand-deep/90', 'text-brand-light');
            if (isMobile) {
                navbar.classList.remove('py-3');
                navbar.classList.add('py-4');
            }
        }
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateNavbar);
            ticking = true;
        }
    }, { passive: true });

    // Mobile Menu Button
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', toggleMobileMenu);
    }

    // Fix Mobile Menu Stuck on Link Click
    const mobileLinks = document.querySelectorAll('#mobile-menu a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            const menu = document.getElementById('mobile-menu');
            if (menu && !menu.classList.contains('translate-x-full')) {
                toggleMobileMenu();
            }
        });
    });
};

