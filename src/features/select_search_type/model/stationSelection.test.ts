import { describe, expect, it } from "vitest";

import type { Station } from "@/shared/types/map";
import {
    getVisibleStations,
    isLatLngInsideBounds,
    shouldCenterStation,
    shouldClearSelectedStation,
} from "@/features/select_search_type/model/stationSelection";

describe("stationSelection", () => {
    it("지역화폐 필터를 적용하고 가격 낮은 순으로 정렬한다", () => {
        expect(
            getVisibleStations(
                [
                    createStation({ id: "expensive", price: 1_800, accepted: true }),
                    createStation({ id: "hidden", price: 1_600, accepted: false }),
                    createStation({ id: "cheap", price: 1_700, accepted: true }),
                ],
                true,
            ).map((station) => station.id),
        ).toEqual(["cheap", "expensive"]);
    });

    it("지역화폐 필터가 꺼져 있으면 전체 주유소를 가격 낮은 순으로 정렬한다", () => {
        expect(
            getVisibleStations(
                [
                    createStation({ id: "expensive", price: 1_800, accepted: true }),
                    createStation({ id: "cheap", price: 1_600, accepted: false }),
                ],
                false,
            ).map((station) => station.id),
        ).toEqual(["cheap", "expensive"]);
    });

    it("좌표가 지도 bounds 안에 있는지 확인한다", () => {
        const bounds = {
            southWest: { lat: 37, lng: 126 },
            northEast: { lat: 38, lng: 127 },
        };

        expect(isLatLngInsideBounds({ lat: 37.5, lng: 126.5 }, bounds)).toBe(true);
        expect(isLatLngInsideBounds({ lat: 38.5, lng: 126.5 }, bounds)).toBe(false);
        expect(isLatLngInsideBounds({ lat: 37.5, lng: 127.5 }, bounds)).toBe(false);
    });

    it("좌표가 지도 bounds 밖이면 중심 이동 대상으로 판단한다", () => {
        const bounds = {
            southWest: { lat: 37, lng: 126 },
            northEast: { lat: 38, lng: 127 },
        };

        expect(shouldCenterStation({ lat: 37.5, lng: 126.5 }, bounds)).toBe(false);
        expect(shouldCenterStation({ lat: 36.9, lng: 126.5 }, bounds)).toBe(true);
    });

    it("선택된 주유소가 표시 목록에 없으면 선택 해제가 필요하다고 판단한다", () => {
        expect(shouldClearSelectedStation("station-1", [createStation({ id: "station-2" })])).toBe(true);
        expect(shouldClearSelectedStation("station-1", [createStation({ id: "station-1" })])).toBe(false);
        expect(shouldClearSelectedStation(null, [createStation({ id: "station-1" })])).toBe(false);
    });
});

function createStation({
    id,
    price = 1_700,
    accepted = true,
}: {
    id: string;
    price?: number;
    accepted?: boolean | null;
}): Station {
    return {
        id,
        name: id,
        price,
        lat: 37.5,
        lng: 126.5,
        localCurrency: {
            accepted,
            status: accepted === true ? "ACCEPTED" : "NOT_ACCEPTED",
        },
    };
}
