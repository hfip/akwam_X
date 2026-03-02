const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

// تعريف الإضافة بشكل مبسط جداً للتأكد من التشغيل
const manifest = {
    id: "org.aksv.addon",
    version: "1.0.0",
    name: "AK SV Addon",
    description: "إضافة موقع AK SV لستريمو",
    resources: ["catalog", "stream"],
    types: ["movie"],
    catalogs: [
        {
            type: "movie",
            id: "ak_main",
            name: "المحتوى المتاح"
        }
    ]
};

const builder = new addonBuilder(manifest);

// معالج الكتالوج - عرض رسالة تجريبية للتأكد من الربط
builder.defineCatalogHandler(() => {
    return Promise.resolve({
        metas: [
            {
                id: "test_vid",
                type: "movie",
                name: "مبروك! الإضافة تعمل بنجاح",
                poster: "https://via.placeholder.com/150",
                description: "إذا رأيت هذا، فالسيرفر يعمل. الآن يمكنك إضافة روابط موقعك."
            }
        ]
    });
});

// معالج الستريم
builder.defineStreamHandler(() => {
    return Promise.resolve({ streams: [] });
});

// تشغيل السيرفر وتحديد المنفذ تلقائياً لـ Render
const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
