const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, '../assets');

// Configuration
const CONFIG = {
    maxWidth: 1600, // Reduced max width for hero images
    quality: 80,
    thumbWidth: 300,
    thumbQuality: 70
};

// Ensure assets dir exists
if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`Assets directory not found: ${ASSETS_DIR}`);
    process.exit(1);
}

// Get all image files
const files = fs.readdirSync(ASSETS_DIR).filter(file => {
    return /\.(jpg|jpeg|png)$/i.test(file);
});

console.log(`Found ${files.length} images to process...`);

let savedBytes = 0;

async function processImages() {
    for (const file of files) {
        const filePath = path.join(ASSETS_DIR, file);
        const fileName = path.parse(file).name;

        // 1. Generate Main WebP
        const mainOutputPath = path.join(ASSETS_DIR, `${fileName}.webp`);

        // Check if already exists to skip? optional. For now, overwrite.

        const stats = fs.statSync(filePath);
        const originalSize = stats.size;

        try {
            await sharp(filePath)
                .resize({ width: CONFIG.maxWidth, withoutEnlargement: true })
                .webp({ quality: CONFIG.quality })
                .toFile(mainOutputPath);

            const newStats = fs.statSync(mainOutputPath);
            const saved = originalSize - newStats.size;
            savedBytes += saved;

            console.log(`✅ [${file}] -> [${fileName}.webp]`);
            console.log(`   Size: ${(originalSize / 1024).toFixed(2)}KB -> ${(newStats.size / 1024).toFixed(2)}KB`);
            if (saved > 0) console.log(`   Saved: ${(saved / 1024).toFixed(2)}KB`);

        } catch (err) {
            console.error(`❌ Error processing ${file}:`, err.message);
        }

        // 2. Generate Thumbnail WebP
        const thumbOutputPath = path.join(ASSETS_DIR, `${fileName}-thumb.webp`);

        try {
            await sharp(filePath)
                .resize({ width: CONFIG.thumbWidth, withoutEnlargement: true })
                .webp({ quality: CONFIG.thumbQuality })
                .toFile(thumbOutputPath);

            console.log(`   Thumb created: ${fileName}-thumb.webp`);
        } catch (err) {
            console.error(`❌ Error creating thumbnail for ${file}:`, err.message);
        }
    }

    console.log('\n=============================================');
    console.log(`🎉 Optimization Complete!`);
    console.log(`Total Space Saved: ${(savedBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log('=============================================');
}

processImages();
