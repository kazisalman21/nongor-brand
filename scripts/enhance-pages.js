/**
 * Batch enhance all HTML pages:
 * 1. Add <noscript> fallback after <body>
 * 2. Add WhatsApp + Messenger floating buttons before </body>
 * 3. Add aria-label to footer social links
 * 
 * Run: node scripts/enhance-pages.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Pages that need noscript (all public pages)
const noscriptPages = [
    'index.html', 'about.html', 'faq.html', 'terms.html',
    'shipping-info.html', 'return-policy.html', 'privacy-policy.html',
    'checkout.html', 'product.html', 'track.html', '404.html'
];

// Pages that need floating WhatsApp + Messenger buttons
// (index.html, product.html, checkout.html already have them)
const fabPages = [
    'about.html', 'faq.html', 'terms.html',
    'shipping-info.html', 'return-policy.html', 'privacy-policy.html',
    'track.html'
];

const NOSCRIPT_BLOCK = `
    <!-- No JavaScript Fallback -->
    <noscript>
        <div style="text-align:center;padding:60px 20px;font-family:'Segoe UI',sans-serif;background:#f8f7f4;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:3rem;margin-bottom:16px">⚓</div>
            <h2 style="color:#3D405B;margin-bottom:12px;font-size:1.5rem">JavaScript প্রয়োজন</h2>
            <p style="color:#666;max-width:400px;line-height:1.6">এই ওয়েবসাইট ব্যবহার করতে আপনার ব্রাউজারে JavaScript চালু করুন।</p>
            <p style="color:#999;margin-top:8px;font-size:0.85rem">Please enable JavaScript to use this website.</p>
        </div>
    </noscript>`;

const FAB_BLOCK = `

    <!-- Floating Action Buttons -->
    <div class="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end safe-bottom">
        <!-- WhatsApp Button -->
        <a href="https://wa.me/message/74UB552NKNJYG1" target="_blank" rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            class="bg-green-500 text-white p-3.5 rounded-full shadow-2xl hover:bg-green-600 transition-all transform hover:scale-110 hover:-translate-y-1 relative group">
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path
                    d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span
                class="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Chat
                on WhatsApp</span>
        </a>

        <!-- Messenger Chat Button -->
        <a href="https://m.me/857107060814707" target="_blank" rel="noopener noreferrer"
            aria-label="Chat on Messenger"
            class="bg-blue-600 text-white p-3.5 rounded-full shadow-2xl hover:bg-blue-700 transition-all transform hover:scale-110 hover:-translate-y-1 relative group">
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path
                    d="M12 2C6.48 2 2 6.03 2 11C2 13.66 3.34 16.05 5.5 17.65V22L9.64 19.74C10.4 19.91 11.19 20 12 20C17.52 20 22 15.97 22 11C22 6.03 17.52 2 12 2ZM13.19 14.88L10.79 12.33L6.11 14.88L11.21 9.46L13.61 12.01L18.29 9.46L13.19 14.88Z" />
            </svg>
            <span
                class="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Chat
                with Us</span>
        </a>
    </div>`;

let totalChanges = 0;

// 1. Add <noscript> to all pages
for (const file of noscriptPages) {
    const filePath = path.join(ROOT, file);
    let html = fs.readFileSync(filePath, 'utf8');

    if (html.includes('<noscript>')) {
        console.log(`  ⏭️  ${file}: already has <noscript>`);
        continue;
    }

    // Insert after first <body...> tag
    html = html.replace(/(<body[^>]*>)/i, `$1${NOSCRIPT_BLOCK}`);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  ✅ ${file}: added <noscript>`);
    totalChanges++;
}

// 2. Add floating buttons to pages that don't have them
for (const file of fabPages) {
    const filePath = path.join(ROOT, file);
    let html = fs.readFileSync(filePath, 'utf8');

    if (html.includes('wa.me/message')) {
        console.log(`  ⏭️  ${file}: already has WhatsApp button`);
        continue;
    }

    // Insert before </body>
    html = html.replace('</body>', `${FAB_BLOCK}\n</body>`);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  ✅ ${file}: added floating WhatsApp + Messenger buttons`);
    totalChanges++;
}

// 3. Add aria-labels to footer social links that are missing them
const allPages = [...new Set([...noscriptPages, ...fabPages])];
for (const file of allPages) {
    const filePath = path.join(ROOT, file);
    let html = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Facebook links without aria-label
    if (html.includes('facebook.com') && !html.match(/facebook\.com\/[^"]*aria-label/)) {
        html = html.replace(
            /(<a href="https:\/\/www\.facebook\.com\/[^"]*"[^>]*?)(>)/g,
            (match, before, after) => {
                if (before.includes('aria-label')) return match;
                changed = true;
                return `${before} aria-label="Visit our Facebook page"${after}`;
            }
        );
    }

    // Instagram links without aria-label
    html = html.replace(
        /(<a href="https:\/\/www\.instagram\.com\/[^"]*"[^>]*?)(>)/g,
        (match, before, after) => {
            if (before.includes('aria-label')) return match;
            changed = true;
            return `${before} aria-label="Follow us on Instagram"${after}`;
        }
    );

    // Messenger footer links without aria-label
    html = html.replace(
        /(<a href="https:\/\/m\.me\/[^"]*"[^>]*?)(>)/g,
        (match, before, after) => {
            if (before.includes('aria-label')) return match;
            changed = true;
            return `${before} aria-label="Chat on Messenger"${after}`;
        }
    );

    if (changed) {
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`  ✅ ${file}: added aria-labels to social links`);
        totalChanges++;
    }
}

console.log(`\n🎉 Done! ${totalChanges} files modified.`);
