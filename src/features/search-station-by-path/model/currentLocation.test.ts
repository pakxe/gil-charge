import { describe, expect, it } from "vitest";

import {
    getDistanceMeters,
    getNextCurrentLocationStatus,
    shouldRenderLocationUpdate,
} from "@/features/search-station-by-path/model/currentLocation";

describe("currentLocation status transition", () => {
    it("요청을 시작하면 locating 상태가 된다", () => {
        expect(getNextCurrentLocationStatus("idle", { type: "request" })).toBe("locating");
        expect(getNextCurrentLocationStatus("paused", { type: "request" })).toBe("locating");
    });

    it("이미 추적 중이거나 stale 상태에서 다시 요청하면 tracking 상태를 유지한다", () => {
        expect(getNextCurrentLocationStatus("tracking", { type: "request" })).toBe("tracking");
        expect(getNextCurrentLocationStatus("stale", { type: "request" })).toBe("tracking");
    });

    it("위치 수신 성공, 권한 거부, 최초 실패, 추적 중 실패 상태를 구분한다", () => {
        expect(getNextCurrentLocationStatus("locating", { type: "success" })).toBe("tracking");
        expect(getNextCurrentLocationStatus("locating", { type: "permissionDenied" })).toBe("blocked");
        expect(getNextCurrentLocationStatus("locating", { type: "initialFailure" })).toBe("idle");
        expect(getNextCurrentLocationStatus("tracking", { type: "trackingFailure" })).toBe("stale");
    });

    it("탭 비활성화와 재활성화 상태를 전이한다", () => {
        expect(getNextCurrentLocationStatus("tracking", { type: "pause" })).toBe("paused");
        expect(getNextCurrentLocationStatus("paused", { type: "resume" })).toBe("tracking");
        expect(getNextCurrentLocationStatus("idle", { type: "resume" })).toBe("idle");
    });

    it("geolocation 미지원 상태를 unavailable로 전이한다", () => {
        expect(getNextCurrentLocationStatus("idle", { type: "unavailable" })).toBe("unavailable");
    });
});

describe("currentLocation render filter", () => {
    const baseLocation = { lat: 37.5665, lng: 126.978 };

    it("첫 위치는 시간과 거리 조건 없이 화면에 반영한다", () => {
        expect(
            shouldRenderLocationUpdate(
                {
                    lastRenderedLocation: null,
                    lastRenderedAt: 0,
                },
                baseLocation,
                0,
            ),
        ).toBe(true);
    });

    it("2초가 지나지 않으면 5m 이상 이동해도 화면에 반영하지 않는다", () => {
        const movedOver5Meters = { lat: 37.5666, lng: 126.978 };

        expect(
            shouldRenderLocationUpdate(
                {
                    lastRenderedLocation: baseLocation,
                    lastRenderedAt: 1_000,
                },
                movedOver5Meters,
                2_999,
            ),
        ).toBe(false);
    });

    it("2초가 지나도 5m 미만 이동이면 화면에 반영하지 않는다", () => {
        const movedUnder5Meters = { lat: 37.56653, lng: 126.978 };

        expect(
            shouldRenderLocationUpdate(
                {
                    lastRenderedLocation: baseLocation,
                    lastRenderedAt: 1_000,
                },
                movedUnder5Meters,
                3_000,
            ),
        ).toBe(false);
    });

    it("2초와 5m 조건을 모두 만족하면 화면에 반영한다", () => {
        const movedOver5Meters = { lat: 37.5666, lng: 126.978 };

        expect(
            shouldRenderLocationUpdate(
                {
                    lastRenderedLocation: baseLocation,
                    lastRenderedAt: 1_000,
                },
                movedOver5Meters,
                3_000,
            ),
        ).toBe(true);
    });

    it("위도 0.0001도 이동은 약 11m로 계산한다", () => {
        expect(getDistanceMeters({ lat: 37, lng: 127 }, { lat: 37.0001, lng: 127 })).toBeGreaterThan(10);
        expect(getDistanceMeters({ lat: 37, lng: 127 }, { lat: 37.0001, lng: 127 })).toBeLessThan(12);
    });
});
