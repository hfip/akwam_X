<meta name='viewport' content='width=device-width, initial-scale=1'/>const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const SITE_URL = "https://ak.sv";

const manifest = {
    id: "org.aksv.direct",
    version: "1.1.0",
    name: "AK.SV Direct",
    description: "شاهد أفلام AK.SV مباشرة داخل ستريمو",
    resources: ["catalog", "stream"],
    types: ["movie"],
    catalogs: [
        {
            type: "movie",
            id: "ak_latest",
            name: "آخر الأفلام المضافة"
        }
    ]
};

const builder = new addonBuilder(manifest);

// دالة لجلب قائمة الأفلام من الصفحة الرئيسية
builder.defineCatalogHandler(async () => {
    try {
        const { data } = await axios.get(`${SITE_URL}/main`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        let metas = [];

        // هذا الجزء يحتاج لتعديل بسيط بناءً على "الكلاس" (Class) الموجود في كود موقعك
        $(".video-box, .item, .movie-card").each((i, el) => {
            const title = $(el).find("h2, .title, a").text().trim();
            const pageUrl = $(el).find("a").attr("href");
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
        return { metas };
    } catch (e) {
        return { metas: [] };
    }
});

// دالة استخراج رابط الـ MP4 من صفحة الفيلم
builder.defineStreamHandler(async ({ id }) => {
    try {
        const moviePageUrl = Buffer.from(id, 'base64').toString('ascii');
        const fullUrl = moviePageUrl.startsWith('http') ? moviePageUrl : `${SITE_URL}${moviePageUrl}`;
        
        const { data } = await axios.get(fullUrl);
        const $ = cheerio.load(data);
        
        // البحث عن أي وسم فيديو يحتوي على رابط mp4
        let videoUrl = $("video source[src*='.mp4']").attr("src") 
                    || $("a[href*='.mp4']").attr("href")
                    || data.match(/https?:\/\/[^"']+\.mp4/g)?.[0];

        if (videoUrl) {
            return {
                streams: [
                    {
                        title: "جودة عالية HD (MP4)",
                        url: videoUrl
                    }
                ]
            };
        }
        return { streams: [] };
    } catch (e) {
        return { streams: [] };
    }
});

serveHTTP(builder.getInterface(), { port: 7000 });
console.log("الآن يمكنك إضافة الرابط التالي لستريمو: http://localhost:7000/manifest.json");
