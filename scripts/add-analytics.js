/**
 * Add Google Analytics 4 to all public HTML pages
 * Run: node scripts/add-analytics.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GA_ID = 'G-L96D9CXWFY';

const pages = [
    'index.html', 'about.html', 'faq.html', 'terms.html',
    'shipping-info.html', 'return-policy.html', 'privacy-policy.html',
    'checkout.html', 'product.html', 'track.html', '404.html'
];

const GA_SNIPPET = `
    <!-- Google Analytics 4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}');
    </script>`;

let count = 0;

for (const file of pages) {
    const filePath = path.join(ROOT, file);
    let html = fs.readFileSync(filePath, 'utf8');

    if (html.includes(GA_ID)) {
        console.log(`  ⏭️  ${file}: already has GA4`);
        continue;
    }

    // Insert before </head>
    html = html.replace('</head>', `${GA_SNIPPET}\n</head>`);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  ✅ ${file}: added GA4`);
    count++;
}

console.log(`\n🎉 Done! GA4 (${GA_ID}) added to ${count} pages.`);
