import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { getDistanceInMeters, samplePathPoints } = require("./geo.js");

const STEP_RADIUS_METERS = 1000;
const EXPECTED_STEP_METERS = STEP_RADIUS_METERS * 0.8;

function path(points) {
    return [{ id: "test-path", type: "waypoint", points }];
}

function pointAboutMetersNorth(origin, meters) {
    return {
        lat: origin.lat + meters / 111195,
        lng: origin.lng,
    };
}

function distance(a, b) {
    return getDistanceInMeters(a.lat, a.lng, b.lat, b.lng);
}

function expectPointClose(actual, expected) {
    expect(actual.lat).toBeCloseTo(expected.lat, 6);
    expect(actual.lng).toBeCloseTo(expected.lng, 6);
}

describe("samplePathPoints", () => {
    it("points가 없으면 빈 배열을 반환한다", () => {
        expect(samplePathPoints(path([]), STEP_RADIUS_METERS)).toEqual([]);
    });

    it("point가 하나면 해당 point만 대표점으로 사용한다", () => {
        const start = { lat: 37.1, lng: 127.1 };

        expect(samplePathPoints(path([start]), STEP_RADIUS_METERS)).toEqual([start]);
    });

    it("긴 waypoint 구간을 검색 간격 기준으로 보간하고 마지막 waypoint를 포함한다", () => {
        const start = { lat: 0, lng: 0 };
        const end = pointAboutMetersNorth(start, 10000);

        const sampledPoints = samplePathPoints(path([start, end]), STEP_RADIUS_METERS);

        expect(sampledPoints.length).toBeGreaterThan(10);
        expectPointClose(sampledPoints[0], start);
        expectPointClose(sampledPoints[sampledPoints.length - 1], end);

        for (let i = 1; i < sampledPoints.length; i++) {
            expect(distance(sampledPoints[i - 1], sampledPoints[i])).toBeLessThanOrEqual(EXPECTED_STEP_METERS + 5);
        }
    });

    it("여러 선분이 이어질 때 선분 경계에서 샘플 간격을 리셋하지 않는다", () => {
        const start = { lat: 0, lng: 0 };
        const middle = pointAboutMetersNorth(start, 500);
        const end = pointAboutMetersNorth(start, 1000);

        const sampledPoints = samplePathPoints(path([start, middle, end]), STEP_RADIUS_METERS);

        expect(sampledPoints).toHaveLength(3);
        expectPointClose(sampledPoints[0], start);
        expect(distance(start, sampledPoints[1])).toBeCloseTo(EXPECTED_STEP_METERS, -1);
        expectPointClose(sampledPoints[2], end);
    });

    it("대표점이 5m 이내로 겹치면 중복 제거한다", () => {
        const start = { lat: 0, lng: 0 };
        const duplicate = pointAboutMetersNorth(start, 2);
        const end = pointAboutMetersNorth(start, 800);

        const sampledPoints = samplePathPoints(path([start, duplicate, end]), STEP_RADIUS_METERS);

        for (let i = 1; i < sampledPoints.length; i++) {
            expect(distance(sampledPoints[i - 1], sampledPoints[i])).toBeGreaterThan(5);
        }
    });
});
