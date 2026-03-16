const proj4 = require("proj4");

const WGS84 = "EPSG:4326";
proj4.defs(
    "KATECH",
    "+proj=tmerc +lat_0=38 +lon_0=127.9995972222222 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43",
);

function toKatech(lat, lng) {
    const [x, y] = proj4(WGS84, "KATECH", [lng, lat]);
    return { x: Math.round(x), y: Math.round(y) };
}

function toWgs84(x, y) {
    const [lng, lat] = proj4("KATECH", WGS84, [x, y]);
    return { lat, lng };
}

module.exports = { toKatech, toWgs84 };
