const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const SITE_URL = "https://ak.sv";

const manifest = {
    id: "org.akwam.aymene.node",
    version: "3.1.0",
    name: "AKWAM Advanced",
    description: "إضافة أكوام المطورة - تشغيل مباشر MP4",
    resources: ["catalog", "stream"],
    types: ["movie", "series"],
    catalogs: [
        { type: "movie", id: "ak_movies", name: "أفلام أكوام" },
        { type: "series", id: "ak_series", name: "مسلسلات أكوام" }
    ]
};

const builder = new addonBuilder(manifest);

// دالة جلب البيانات مع تجاوز الحماية
async function getAkwamHTML(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': SITE_URL
            },
            timeout: 10000
        });
        return cheerio.load(data);
    } catch (e) {
        console.error("Fetch Error:", e.message);
        return null;
    }
}

builder.defineCatalogHandler(async ({ type }) => {
    const category = type === "movie" ? "movies" : "series";
    const $ = await getAkwamHTML(`${SITE_URL}/${category}`);
    if (!$) return { metas: [] };

    let metas = [];
    // بناءً على هيكلة أكوام المعتادة
    $(".widget-box .col-lg-2, .movie-item, [class*='item']").each((i, el) => {
        const link = $(el).find("a").attr("href");
        const title = $(el).find(".title, h2, h3").text().trim();
        const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");

        if (link && title) {
            metas.push({
                id: Buffer.from(link).toString('base64'),
                type: type,
                name: title,
                poster: img?.startsWith('http') ? img : `${SITE_URL}${img}`
            });
        }
    });
    return { metas: metas.slice(0, 50) };
});

builder.defineStreamHandler(async ({ id }) => {
    try {
        const movieUrl = Buffer.from(id, 'base64').toString('ascii');
        const $ = await getAkwamHTML(movieUrl);
        if (!$) return { streams: [] };

        let streams = [];
        // البحث عن روابط MP4 المباشرة في صفحة المشاهدة/التحميل
        const pageContent = $.html();
        const mp4Links = pageContent.match(/https?:\/\/[^"']+\.mp4/g);

        if (mp4Links) {
            mp4Links.forEach((link, index) => {
                streams.push({
                    title: `سيرفر أكوام مباشر ${index + 1}`,
                    url: link
                });
            });
        }

        return { streams };
    } catch (e) {
        return { streams: [] };
    }
});

// المنفذ الديناميكي لـ Render
const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
