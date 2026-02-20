// ==============================================
// NAVIGATION — Navbar and mobile menu
// ==============================================

window.toggleMobileMenu = function () {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('mobile-menu-btn');

    if (menu.classList.contains('translate-x-full')) {
        menu.classList.remove('translate-x-full');
        btn.innerHTML = '&times;';
        btn.classList.add('text-brand-light');
        btn.style.color = '#F4F1DE';
        document.body.style.overflow = 'hidden';
    } else {
        menu.classList.add('translate-x-full');
        btn.innerHTML = '&#9776;';
        btn.classList.remove('text-brand-light');
        btn.style.color = '';
        document.body.style.overflow = '';
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
            if (!isMobile) {
                navbar.classList.remove('bg-transparent', 'text-brand-light');
                navbar.classList.add('bg-white', 'shadow-md', 'text-brand-deep');
            } else {
                navbar.classList.add('bg-white', 'shadow-md', 'py-3');
                navbar.classList.remove('py-6', 'bg-transparent');
            }
        } else {
            if (!isMobile) {
                navbar.classList.add('bg-transparent', 'text-brand-light');
                navbar.classList.remove('bg-white', 'shadow-md', 'text-brand-deep');
            } else {
                navbar.classList.remove('bg-white', 'shadow-md', 'py-3');
                navbar.classList.add('py-6', 'bg-transparent');
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
