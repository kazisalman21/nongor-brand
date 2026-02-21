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
    const ctaBtn = navbar ? navbar.querySelector('.nav-cta') : null;
    const searchInput = navbar ? navbar.querySelector('#desktop-search') : null;
    const cartBtn = navbar ? navbar.querySelector('.nav-cart') : null;
    let ticking = false;

    const updateNavbar = () => {
        if (!navbar) return;
        const isMobile = window.innerWidth < 1024;

        if (window.scrollY > 50) {
            // Scrolled: solid white background, dark text
            navbar.classList.remove('md:bg-transparent', 'md:backdrop-blur-none');
            navbar.classList.add('bg-white/95', 'shadow-md', 'text-brand-deep', 'border-b-gray-100/50');
            navbar.classList.remove('bg-brand-deep/90', 'text-brand-light');
            navbar.setAttribute('data-scrolled', 'true');

            // Fix CTA button colors for white bg
            if (ctaBtn) {
                ctaBtn.classList.remove('text-brand-light', 'bg-brand-terracotta/10', 'border-brand-terracotta/30');
                ctaBtn.classList.add('text-white', 'bg-brand-terracotta', 'border-brand-terracotta');
            }

            // Fix search bar for white bg
            if (searchInput) {
                searchInput.classList.remove('bg-white/5', 'border-white/10', 'text-brand-light', 'placeholder-white/40');
                searchInput.classList.add('bg-gray-100', 'border-gray-200', 'text-brand-deep', 'placeholder-gray-400');
            }

            // Fix cart icon for white bg
            if (cartBtn) {
                cartBtn.classList.remove('text-brand-light');
                cartBtn.classList.add('text-brand-deep');
            }

            if (isMobile) {
                navbar.classList.remove('py-4');
                navbar.classList.add('py-3');
            }
        } else {
            // Top: transparent/branded
            navbar.classList.add('md:bg-transparent', 'md:backdrop-blur-none');
            navbar.classList.remove('bg-white/95', 'shadow-md', 'text-brand-deep', 'border-b-gray-100/50');
            navbar.classList.add('bg-brand-deep/90', 'text-brand-light');
            navbar.removeAttribute('data-scrolled');

            // Restore CTA button
            if (ctaBtn) {
                ctaBtn.classList.add('text-brand-light', 'bg-brand-terracotta/10', 'border-brand-terracotta/30');
                ctaBtn.classList.remove('text-white', 'bg-brand-terracotta', 'border-brand-terracotta');
            }

            // Restore search bar
            if (searchInput) {
                searchInput.classList.add('bg-white/5', 'border-white/10', 'text-brand-light', 'placeholder-white/40');
                searchInput.classList.remove('bg-gray-100', 'border-gray-200', 'text-brand-deep', 'placeholder-gray-400');
            }

            // Restore cart icon
            if (cartBtn) {
                cartBtn.classList.add('text-brand-light');
                cartBtn.classList.remove('text-brand-deep');
            }

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

    // Global function for mobile menu link navigation (called via inline onclick)
    window.mobileNavClick = function (href, event) {
        // Close the mobile menu first
        const menu = document.getElementById('mobile-menu');
        if (menu && !menu.classList.contains('translate-x-full')) {
            toggleMobileMenu();
        }

        if (href.startsWith('#')) {
            // Hash link — prevent default, handle scroll or redirect
            if (event) event.preventDefault();
            const targetEl = document.querySelector(href);
            if (targetEl) {
                // Scroll to the section after menu closes
                setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth' }), 300);
            } else {
                // Section doesn't exist on this page — navigate to index.html with the hash
                setTimeout(() => { window.location.href = 'index.html' + href; }, 150);
            }
        } else {
            // Page link (e.g. track.html, about.html) — let browser follow href naturally
            // Don't preventDefault — the native <a href> will navigate
        }
    };

    // Global Search Handling (Desktop & Mobile)
    const handleSearchEnter = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = e.target.value.trim();
            const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

            if (isHomePage) {
                // If on mobile menu, close it
                const menu = document.getElementById('mobile-menu');
                if (menu && !menu.classList.contains('translate-x-full')) {
                    toggleMobileMenu();
                }
                // Scroll to collection
                const collection = document.getElementById('collection');
                if (collection) collection.scrollIntoView({ behavior: 'smooth' });

                if (window.handleSearch) window.handleSearch(query);
            } else {
                // Route to index.html with search query
                window.location.href = `index.html?search=${encodeURIComponent(query)}#collection`;
            }
        }
    };

    const dSearch = document.getElementById('desktop-search');
    const mSearch = document.getElementById('mobile-search');
    if (dSearch) dSearch.addEventListener('keypress', handleSearchEnter);
    if (mSearch) mSearch.addEventListener('keypress', handleSearchEnter);
};
