import { describe, expect, it } from "vitest";
import { pointInPolygon } from "@/shared/lib/pointInPolygon";
import type { LatLng } from "@/shared/model/map";

const polygonPath: LatLng[] = [
    { lat: 35, lng: 127 },
    { lat: 35, lng: 128 },
    { lat: 36, lng: 128 },
    { lat: 36, lng: 127 },
];

describe("pointInPolygon", () => {
    it("polygon 내부 점이면 true를 반환한다", () => {
        expect(pointInPolygon({ lat: 35.5, lng: 127.5 }, polygonPath)).toBe(true);
    });

    it("polygon 외부 점이면 false를 반환한다", () => {
        expect(pointInPolygon({ lat: 36.5, lng: 127.5 }, polygonPath)).toBe(false);
    });

    it("polygon 경계선 위 점은 포함한다", () => {
        expect(pointInPolygon({ lat: 35.5, lng: 127 }, polygonPath)).toBe(true);
    });

    it("polygon 꼭짓점 위 점은 포함한다", () => {
        expect(pointInPolygon({ lat: 35, lng: 127 }, polygonPath)).toBe(true);
    });

    it("열린 polygon path를 내부에서 닫아 처리한다", () => {
        expect(pointInPolygon({ lat: 35.5, lng: 127.5 }, polygonPath)).toBe(true);
    });

    it("이미 닫힌 polygon path도 처리한다", () => {
        expect(pointInPolygon({ lat: 35.5, lng: 127.5 }, [...polygonPath, { lat: 35, lng: 127 }])).toBe(true);
    });

    it("꼭짓점이 3개 미만이면 false를 반환한다", () => {
        expect(pointInPolygon({ lat: 35.5, lng: 127.5 }, polygonPath.slice(0, 2))).toBe(false);
    });

    it("LatLng를 GeoJSON 좌표 순서인 [lng, lat]로 변환한다", () => {
        const asymmetricPath: LatLng[] = [
            { lat: 10, lng: 120 },
            { lat: 10, lng: 121 },
            { lat: 11, lng: 121 },
            { lat: 11, lng: 120 },
        ];

        expect(pointInPolygon({ lat: 10.5, lng: 120.5 }, asymmetricPath)).toBe(true);
    });
});
