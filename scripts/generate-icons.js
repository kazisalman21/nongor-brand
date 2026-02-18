/**
 * Generate PWA Icons from logo.jpeg
 * Run: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'assets', 'logo.jpeg');
const OUT = path.join(__dirname, '..', 'assets');

const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
];

(async () => {
    for (const { name, size } of sizes) {
        await sharp(SOURCE)
            .resize(size, size, { fit: 'cover' })
            .png({ quality: 90 })
            .toFile(path.join(OUT, name));
        console.log(`✅ Generated ${name} (${size}x${size})`);
    }
    console.log('🎉 All PWA icons generated!');
})();
