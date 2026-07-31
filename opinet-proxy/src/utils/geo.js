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

const DEDUPE_EPSILON_METERS = 5;

function interpolatePoint(start, end, ratio) {
    return {
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio,
    };
}

function isNearbyPoint(pointA, pointB, epsilonMeters) {
    return getDistanceInMeters(pointA.lat, pointA.lng, pointB.lat, pointB.lng) <= epsilonMeters;
}

function dedupeConsecutiveNearbyPoints(points, epsilonMeters = DEDUPE_EPSILON_METERS) {
    const dedupedPoints = [];

    points.forEach((point) => {
        const previousPoint = dedupedPoints[dedupedPoints.length - 1];

        if (!previousPoint || !isNearbyPoint(previousPoint, point, epsilonMeters)) {
            dedupedPoints.push(point);
        }
    });

    return dedupedPoints;
}

function dedupeNearbyPoints(points, epsilonMeters = DEDUPE_EPSILON_METERS) {
    const dedupedPoints = [];

    points.forEach((point) => {
        const hasNearbyPoint = dedupedPoints.some((dedupedPoint) => isNearbyPoint(dedupedPoint, point, epsilonMeters));

        if (!hasNearbyPoint) {
            dedupedPoints.push(point);
        }
    });

    return dedupedPoints;
}

function samplePolylinePoints(points, stepMeters) {
    if (points.length <= 1) {
        return points;
    }

    const sampledPoints = [points[0]];
    let distanceSinceLastSample = 0;

    for (let i = 1; i < points.length; i++) {
        const segmentStart = points[i - 1];
        const segmentEnd = points[i];
        const segmentLength = getDistanceInMeters(segmentStart.lat, segmentStart.lng, segmentEnd.lat, segmentEnd.lng);

        if (segmentLength === 0) {
            continue;
        }

        let remainingSegmentLength = segmentLength;

        while (distanceSinceLastSample + remainingSegmentLength >= stepMeters) {
            const distanceToNextSample = stepMeters - distanceSinceLastSample;
            const distanceFromSegmentStart = segmentLength - remainingSegmentLength + distanceToNextSample;
            const ratio = distanceFromSegmentStart / segmentLength;

            sampledPoints.push(interpolatePoint(segmentStart, segmentEnd, ratio));
            remainingSegmentLength -= distanceToNextSample;
            distanceSinceLastSample = 0;
        }

        distanceSinceLastSample += remainingSegmentLength;
    }

    const lastPoint = points[points.length - 1];
    const lastSampledPoint = sampledPoints[sampledPoints.length - 1];

    if (!isNearbyPoint(lastSampledPoint, lastPoint, DEDUPE_EPSILON_METERS)) {
        sampledPoints.push(lastPoint);
    }

    return sampledPoints;
}

// 경로 샘플링 (대표 점 추출)
function samplePathPoints(paths, radiusInMeters) {
    const sampledPoints = [];
    const stepMeters = Math.max(radiusInMeters * 0.8, DEDUPE_EPSILON_METERS + 1);

    paths.forEach((path) => {
        const points = dedupeConsecutiveNearbyPoints(path.points || []);
        if (!points || points.length === 0) return;

        sampledPoints.push(...samplePolylinePoints(points, stepMeters));
    });

    return dedupeNearbyPoints(sampledPoints);
}

module.exports = { getDistanceInMeters, samplePathPoints };
