const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const SITE_URL = "https://ak.sv";

const manifest = {
    id: "org.aksv.pro",
    version: "2.0.0",
    name: "AK.SV Content",
    description: "الأفلام والمسلسلات مباشرة من AK.SV بجودة MP4",
    resources: ["catalog", "stream"],
    types: ["movie", "series"],
    catalogs: [
        {
            type: "movie",
            id: "ak_latest",
            name: "آخر الأفلام المضافة"
        }
    ]
};

const builder = new addonBuilder(manifest);

// 1. جلب قائمة الأفلام من الموقع
builder.defineCatalogHandler(async () => {
    try {
        const { data } = await axios.get(`${SITE_URL}/main`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        let metas = [];

        // استهداف العناصر التي تحتوي على الأفلام (تأكد من الـ Selector)
        $("a[href*='/movie/'], .movie-item, .post").each((i, el) => {
            const title = $(el).text().trim() || $(el).attr('title');
            const pageUrl = $(el).attr("href");
            const thumb = $(el).find("img").attr("src");

            if (title && pageUrl) {
                metas.push({
                    id: Buffer.from(pageUrl).toString('base64'),
                    type: "movie",
                    name: title,
                    poster: thumb?.startsWith('http') ? thumb : `${SITE_URL}${thumb}`
                });
            }
        });

        // إزالة التكرار
        const uniqueMetas = metas.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        return { metas: uniqueMetas };
    } catch (e) {
        return { metas: [] };
    }
});

// 2. استخراج رابط الـ MP4 لتشغيله داخل ستريمو
builder.defineStreamHandler(async ({ id }) => {
    try {
        const moviePageUrl = Buffer.from(id, 'base64').toString('ascii');
        const fullUrl = moviePageUrl.startsWith('http') ? moviePageUrl : `${SITE_URL}${moviePageUrl}`;
        
        const { data } = await axios.get(fullUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        // البحث عن روابط MP4 داخل الصفحة
        const mp4Matches = data.match(/https?:\/\/[^"']+\.mp4/g);

        if (mp4Matches && mp4Matches.length > 0) {
            return {
                streams: mp4Matches.map((link, index) => ({
                    title: `سيرفر مباشر ${index + 1} (MP4)`,
                    url: link
                }))
            };
        }
        
        return { streams: [] };
    } catch (e) {
        return { streams: [] };
    }
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
