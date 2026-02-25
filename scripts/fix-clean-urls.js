const fs = require('fs');
const path = require('path');

const dir = 'e:/Coding/nongor-brand';
const skip = ['admin.html', 'admin-slip.html', 'admin-reset.html', 'email-preview.html'];

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !skip.includes(f));

files.forEach(f => {
    const fp = path.join(dir, f);
    let c = fs.readFileSync(fp, 'utf8');
    const orig = c;

    // Replace index.html#section with /#section
    c = c.replace(/href="index\.html#/g, 'href="/#');
    // Replace href="index.html" with href="/"
    c = c.replace(/href="index\.html"/g, 'href="/"');
    // Replace mobileNavClick('index.html' with mobileNavClick('/'
    c = c.replace(/mobileNavClick\('index\.html'/g, "mobileNavClick('/'");

    if (c !== orig) {
        fs.writeFileSync(fp, c, 'utf8');
        console.log('Fixed:', f);
    } else {
        console.log('Skip:', f);
    }
});

console.log('Done!');
