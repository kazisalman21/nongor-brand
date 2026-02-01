/**
 * Image Optimization Script
 * Compresses and generates WebP versions of images
 * 
 * Run: npm run optimize:images
 * Or: node scripts/optimize-images.js
 */
const fs = require('fs');
const path = require('path');

// Try to use sharp if available, otherwise skip
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.log('⚠️  sharp not installed. Run: npm install sharp');
    console.log('   Skipping server-side optimization.');
    console.log('   Images will be optimized via Cloudinary auto-format.\n');
    process.exit(0);
}

const ASSETS_DIR = path.join(__dirname, '../assets');

// Configuration
const CONFIG = {
    maxWidth: 1200,      // Max width for full images
    quality: 75,         // Quality level (70-80 is good balance)
    thumbWidth: 200,     // Thumbnail width
    thumbQuality: 60     // Thumbnail quality
};

async function optimizeImage(file) {
    const filePath = path.join(ASSETS_DIR, file);
    const fileName = path.parse(file).name;
    const ext = path.parse(file).ext.toLowerCase();

    // Skip if already optimized
    if (fileName.includes('-optimized') || fileName.includes('-thumb')) {
        return;
    }

    try {
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`Processing: ${file} (${sizeMB}MB)`);

        // Generate WebP (25-35% smaller than JPEG)
        const webpPath = path.join(ASSETS_DIR, `${fileName}.webp`);
        await sharp(filePath)
            .resize({ width: CONFIG.maxWidth, withoutEnlargement: true })
            .webp({ quality: CONFIG.quality })
            .toFile(webpPath);

        const webpStats = fs.statSync(webpPath);
        const webpSizeMB = (webpStats.size / (1024 * 1024)).toFixed(2);

        // Generate thumbnail
        const thumbPath = path.join(ASSETS_DIR, `${fileName}-thumb.webp`);
        await sharp(filePath)
            .resize({ width: CONFIG.thumbWidth, withoutEnlargement: true })
            .webp({ quality: CONFIG.thumbQuality })
            .toFile(thumbPath);

        console.log(`  ✅ ${file} → ${fileName}.webp (${webpSizeMB}MB)`);

    } catch (err) {
        console.error(`  ❌ Error: ${file}`, err.message);
    }
}

async function processAll() {
    console.log('\n🖼️  Image Optimization Script');
    console.log('='.repeat(40) + '\n');

    if (!fs.existsSync(ASSETS_DIR)) {
        console.log('❌ Assets directory not found:', ASSETS_DIR);
        return;
    }

    const files = fs.readdirSync(ASSETS_DIR).filter(f =>
        /\.(jpg|jpeg|png)$/i.test(f) &&
        !f.includes('-optimized') &&
        !f.includes('-thumb')
    );

    if (files.length === 0) {
        console.log('No images to optimize.');
        return;
    }

    console.log(`Found ${files.length} images to optimize...\n`);

    for (const file of files) {
        await optimizeImage(file);
    }

    console.log('\n' + '='.repeat(40));
    console.log(`🎉 Optimized ${files.length} images!`);
    console.log('\nTip: Use <img src="image.webp"> for modern browsers');
    console.log('     Use <img src="image-thumb.webp"> for thumbnails');
}

processAll();
