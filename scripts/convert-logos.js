const sharp = require('sharp');
const path = require('path');

const assetsDir = './assets';

const files = [
    { src: 'pathao-logo.png', dest: 'pathao-logo.webp' },
    { src: 'redx-logo.png', dest: 'redx-logo.webp' },
    { src: 'steadfast-logo .jpg', dest: 'steadfast-logo.webp' }
];

async function convertToWebP() {
    for (const file of files) {
        try {
            await sharp(path.join(assetsDir, file.src))
                .webp({ quality: 85 })
                .toFile(path.join(assetsDir, file.dest));
            console.log(`✅ Converted: ${file.src} → ${file.dest}`);
        } catch (err) {
            console.error(`❌ Error converting ${file.src}:`, err.message);
        }
    }
}

convertToWebP();
