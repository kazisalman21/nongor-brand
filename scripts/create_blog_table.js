const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
}

async function createBlogTable() {
    const client = new Client({ connectionString });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        // Create blog_posts table
        console.log('Creating blog_posts table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS blog_posts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                excerpt TEXT,
                content TEXT NOT NULL,
                cover_image TEXT,
                author VARCHAR(100) DEFAULT 'নোঙর টিম',
                tags TEXT[] DEFAULT '{}',
                meta_title VARCHAR(255),
                meta_description TEXT,
                is_published BOOLEAN DEFAULT FALSE,
                views INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ blog_posts table created!');

        // Insert sample blog posts (Bengali body + English meta)
        console.log('Inserting sample blog posts...');
        await client.query(`
            INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, author, tags, meta_title, meta_description, is_published)
            VALUES 
            (
                'বাংলাদেশি কুর্তির ইতিহাস ও ঐতিহ্য',
                'bangladeshi-kurti-history',
                'হাজার বছরের বাংলার বস্ত্র ঐতিহ্য থেকে আজকের আধুনিক কুর্তি — এক সমৃদ্ধ যাত্রার গল্প।',
                '<h2>বাংলার বস্ত্র ঐতিহ্য</h2>
<p>বাংলাদেশের বস্ত্র শিল্পের ইতিহাস হাজার বছরের পুরনো। মসলিন থেকে শুরু করে আজকের হ্যান্ডলুম কুর্তি — এই যাত্রায় আমাদের কারিগররা তাদের শিল্পকে বাঁচিয়ে রেখেছেন।</p>

<h2>মসলিন: সোনালী অতীত</h2>
<p>ঢাকাই মসলিন একসময় বিশ্বের সবচেয়ে মূল্যবান কাপড় ছিল। রোমান সাম্রাজ্য থেকে মুঘল দরবার — সর্বত্র এর চাহিদা ছিল অপরিসীম। এত সূক্ষ্ম ছিল এই কাপড় যে একটি আংটির ভেতর দিয়ে পুরো শাড়ি টেনে নেওয়া যেত।</p>

<h2>আধুনিক কুর্তি: ঐতিহ্য ও আধুনিকতার মেলবন্ধন</h2>
<p>আজকের বাংলাদেশি কুর্তি সেই ঐতিহ্যের ধারাবাহিকতা। হাতের কাজ, প্রাকৃতিক রং, এবং ঐতিহ্যবাহী নকশা — এসব মিলিয়ে তৈরি হয় এক অনন্য পোশাক যা একইসাথে আরামদায়ক ও সুন্দর।</p>

<h2>নোঙর এর প্রতিশ্রুতি</h2>
<p>নোঙর-এ আমরা এই ঐতিহ্যকে সম্মান জানাই। প্রতিটি কুর্তি হাতে তৈরি, প্রতিটি নকশায় বাংলার শেকড়ের ছোঁয়া। আমরা বিশ্বাস করি, পোশাক শুধু পরার জন্য নয় — এটি একটি সংস্কৃতির বাহন।</p>',
                'https://res.cloudinary.com/daalopsqn/image/upload/f_auto,q_auto/v1769523623/lsxxuqx26gef8ujbktm9.webp',
                'নোঙর টিম',
                ARRAY['kurti', 'heritage', 'fashion', 'bangladesh'],
                'History of Bangladeshi Kurti | Nongorr Blog',
                'Explore the rich history of Bangladeshi kurti fashion — from ancient Muslin to modern handmade kurtis. Learn about Bengal textile heritage.',
                true
            ),
            (
                'কুর্তি স্টাইলিং গাইড: ৫টি সহজ টিপস',
                'kurti-styling-guide',
                'প্রতিদিনের কুর্তিকে কীভাবে আরও আকর্ষণীয় করবেন — ৫টি সহজ ও কার্যকরী টিপস।',
                '<h2>কুর্তি স্টাইলিং করা সহজ!</h2>
<p>একটি ভালো কুর্তি আপনার পোশাকের সংগ্রহে অনেক ভার্সটাইল পিস হতে পারে। সঠিক স্টাইলিংয়ে একই কুর্তি বিভিন্ন অনুষ্ঠানে পরা যায়।</p>

<h2>১. সঠিক জুতা বাছাই</h2>
<p>কুর্তির সাথে কোলহাপুরি স্যান্ডেল বা জুটি পরলে ট্র্যাডিশনাল লুক আসে। আবার স্নিকার্সের সাথে পরলে ক্যাজুয়াল ও মডার্ন দেখায়।</p>

<h2>২. লেয়ারিং</h2>
<p>শীতে কুর্তির উপর একটি ডেনিম জ্যাকেট বা ওয়েস্টকোট পরলে স্টাইলিশ ইন্দো-ওয়েস্টার্ন লুক তৈরি হয়।</p>

<h2>৩. অ্যাক্সেসরিজ</h2>
<p>অক্সিডাইজড জুয়েলারি, জুটের ব্যাগ, বা একটি সুন্দর দোপাট্টা — এগুলো কুর্তির লুককে সম্পূর্ণ করে তোলে।</p>

<h2>৪. রঙের মিশ্রণ</h2>
<p>কন্ট্রাস্ট রঙের বটম পরলে কুর্তি আরও আকর্ষণীয় দেখায়। যেমন নীল কুর্তির সাথে সাদা বা অফ-হোয়াইট প্যান্ট।</p>

<h2>৫. ফিটিং</h2>
<p>কাস্টম সাইজিং সবসময় সেরা ফিটিং দেয়। নোঙর-এ আমরা কাস্টম মাপে কুর্তি তৈরি করি — আপনার শরীরের মাপে, আপনার স্টাইলে।</p>',
                './assets/IMG20251101152351.webp',
                'নোঙর টিম',
                ARRAY['styling', 'tips', 'kurti', 'fashion'],
                'Kurti Styling Guide - 5 Easy Tips | Nongorr',
                'Learn how to style your kurti for any occasion with these 5 easy tips. From accessories to layering, make your kurti look stunning.',
                true
            ),
            (
                'হ্যান্ডমেইড পোশাক কেন বেছে নেবেন?',
                'why-choose-handmade',
                'ফাস্ট ফ্যাশনের যুগে হ্যান্ডমেইড পোশাক কেন গুরুত্বপূর্ণ — পরিবেশ, কারিগর ও মানের দিক থেকে।',
                '<h2>ফাস্ট ফ্যাশন বনাম হ্যান্ডমেইড</h2>
<p>আজকের দুনিয়ায় ফাস্ট ফ্যাশন সস্তা ও সহজলভ্য। কিন্তু এর পেছনে আছে পরিবেশ দূষণ, কারিগরদের অবমূল্যায়ন, এবং নিম্নমানের কাপড়। হ্যান্ডমেইড পোশাক এই সমস্যার একটি সুন্দর সমাধান।</p>

<h2>পরিবেশের জন্য ভালো</h2>
<p>হ্যান্ডমেইড পোশাক তৈরিতে কম শক্তি ব্যয় হয়, কম বর্জ্য তৈরি হয়, এবং প্রাকৃতিক উপাদান ব্যবহৃত হয়। এটি টেকসই ফ্যাশনের একটি গুরুত্বপূর্ণ পদক্ষেপ।</p>

<h2>কারিগরদের সম্মান</h2>
<p>প্রতিটি হ্যান্ডমেইড পোশাকের পেছনে একজন দক্ষ কারিগরের ঘণ্টার পর ঘণ্টা শ্রম আছে। এই পোশাক কিনলে আমরা সরাসরি তাদের জীবনমানকে সমর্থন করি।</p>

<h2>অনন্য মান</h2>
<p>মেশিনে তৈরি পোশাক সবার একই হয়। কিন্তু হ্যান্ডমেইড পোশাকে থাকে কারিগরের নিজস্ব ছোঁয়া — প্রতিটি পিস অনন্য।</p>

<h2>নোঙর-এ হ্যান্ডমেইড</h2>
<p>নোঙর ব্র্যান্ডের প্রতিটি কুর্তি হাতে তৈরি। আমাদের কারিগররা বাংলাদেশের বিভিন্ন অঞ্চলের ঐতিহ্যবাহী শিল্পী। তাদের হাতের ছোঁয়ায় তৈরি হয় প্রতিটি নোঙর কুর্তি।</p>',
                './assets/hero-bg.webp',
                'নোঙর টিম',
                ARRAY['handmade', 'sustainable', 'fashion'],
                'Why Choose Handmade Clothing | Nongorr Blog',
                'Discover why handmade clothing is better for the environment, artisans, and your wardrobe. Support sustainable fashion with Nongorr.',
                true
            )
            ON CONFLICT (slug) DO NOTHING
        `);
        console.log('✅ Sample blog posts inserted!');

        console.log('\n🎉 Blog table setup complete!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

createBlogTable();
