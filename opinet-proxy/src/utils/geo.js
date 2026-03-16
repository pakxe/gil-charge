// 두 위경도 사이의 거리를 계산 (Haversine formula, 단위: 미터)
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 경로 샘플링 (대표 점 추출)
function samplePathPoints(paths, radiusInMeters) {
    const sampledPoints = [];
    const stepMeters = radiusInMeters * 0.8;

    paths.forEach((path) => {
        const points = path.points;
        if (!points || points.length === 0) return;

        let lastAddedPoint = points[0];
        sampledPoints.push(lastAddedPoint);

        for (let i = 1; i < points.length; i++) {
            const currentPoint = points[i];
            const distance = getDistanceInMeters(
                lastAddedPoint.lat,
                lastAddedPoint.lng,
                currentPoint.lat,
                currentPoint.lng,
            );

            if (distance >= stepMeters) {
                sampledPoints.push(currentPoint);
                lastAddedPoint = currentPoint;
            }
        }
    });
    return sampledPoints;
}

module.exports = { getDistanceInMeters, samplePathPoints };
