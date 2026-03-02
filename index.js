const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const SITE_URL = "https://ak.sv"; // الرابط الأساسي الحالي

const manifest = {
    id: "org.akwam.aymene",
    version: "3.0.0",
    name: "AKWAM Advanced",
    description: "إضافة أكوام المطورة - مستوحاة من مستودع aymene69",
    resources: ["catalog", "stream", "meta"],
    types: ["movie", "series"],
    catalogs: [
        {
            type: "movie",
            id: "ak_movies",
            name: "أفلام أكوام"
        },
        {
            type: "series",
            id: "ak_series",
            name: "مسلسلات أكوام"
        }
    ]
};

const builder = new addonBuilder(manifest);

// دالة لجلب البيانات من الموقع بناءً على هيكلة المستودع الجاهز
async function fetchAkwamPage(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': SITE_URL
            }
        });
        return cheerio.load(data);
    } catch (e) {
        return null;
    }
}

builder.defineCatalogHandler(async ({ type }) => {
    const targetUrl = type === "movie" ? `${SITE_URL}/movies` : `${SITE_URL}/series`;
    const $ = await fetchAkwamPage(targetUrl);
    if (!$) return { metas: [] };

    let metas = [];
    // استهداف الـ Class الصحيح المعتاد في موقع أكوام
    $(".widget-box .col-lg-2, .movie-item").each((i, el) => {
        const link = $(el).find("a").attr("href");
        const title = $(el).find(".title").text().trim() || $(el).find("h2").text().trim();
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
    return { metas };
});

builder.defineStreamHandler(async ({ id }) => {
    try {
        const movieUrl = Buffer.from(id, 'base64').toString('ascii');
        const $ = await fetchAkwamPage(movieUrl);
        if (!$) return { streams: [] };

        let streams = [];
        // البحث عن روابط الـ MP4 أو أزرار التحميل كما في المستودع القديم
        $("a[href*='download'], a[href*='.mp4'], .download-link").each((i, el) => {
            const href = $(el).attr("href");
            const quality = $(el).text().trim() || "Quality " + (i + 1);
            if (href && href.includes(".mp4")) {
                streams.push({
                    title: `AKWAM - ${quality}`,
                    url: href
                });
            }
        });

        return { streams };
    } catch (e) {
        return { streams: [] };
    }
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
