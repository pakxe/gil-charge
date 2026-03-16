const axios = require("axios");
const config = require("../config");
const { samplePathPoints } = require("../utils/geo");
const { toKatech, toWgs84 } = require("../utils/coordinates");

async function fetchStationsAlongPaths(paths, radiusKm) {
    const radiusMeters = Math.round(radiusKm * 1000);
    const safeRadius = Math.min(radiusMeters, config.MAX_RADIUS_METERS);

    // 1. 대표 좌표 추출
    const targetPoints = samplePathPoints(paths, safeRadius);
    console.log(`총 ${targetPoints.length}개의 대표 지점으로 압축되었습니다.`);

    // 2. 다중 API 병렬 요청
    const fetchPromises = targetPoints.map(async (point) => {
        const { x, y } = toKatech(point.lat, point.lng);
        const opinetUrl = `${config.OPINET_BASE_URL}?code=${config.OPINET_API_KEY}&x=${x}&y=${y}&radius=${safeRadius}&out=json`;

        const response = await axios.get(opinetUrl);
        return response.data.RESULT?.OIL || [];
    });

    const resultsArray = await Promise.all(fetchPromises);

    // 3. 중복 제거 로직
    const uniqueStationsMap = new Map();

    resultsArray.forEach((stationList) => {
        stationList.forEach((station) => {
            if (!uniqueStationsMap.has(station.UNI_ID)) {
                const { lat, lng } = toWgs84(station.GIS_X_COOR, station.GIS_Y_COOR);

                uniqueStationsMap.set(station.UNI_ID, {
                    id: station.UNI_ID,
                    name: station.OS_NM,
                    price: station.PRICE,
                    lat,
                    lng,
                    brand: station.POLL_DIV_CO,
                });
            }
        });
    });

    return Array.from(uniqueStationsMap.values());
}

module.exports = { fetchStationsAlongPaths };
