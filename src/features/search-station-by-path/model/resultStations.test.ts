import { describe, expect, it } from "vitest";

import type { Station } from "@/shared/types/map";
import {
    getStationCenteringDecision,
    getVisibleStations,
    getVisibleMapArea,
    isContainerPointInsideRect,
    isLatLngInsideBounds,
    shouldCenterStation,
    shouldClearSelectedStation,
} from "@/features/search-station-by-path/model/resultStations";

describe("resultStations", () => {
    it("지역화폐 필터를 적용하고 가격 낮은 순으로 정렬한다", () => {
        expect(
            getVisibleStations(
                [
                    createStation({ id: "expensive", price: 1_800, accepted: true }),
                    createStation({ id: "hidden", price: 1_600, accepted: false }),
                    createStation({ id: "cheap", price: 1_700, accepted: true }),
                ],
                { localCurrencyOnly: true, selectedBrandCodes: [] },
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
                { localCurrencyOnly: false, selectedBrandCodes: [] },
            ).map((station) => station.id),
        ).toEqual(["cheap", "expensive"]);
    });

    it("선택한 브랜드 코드에 해당하는 주유소만 표시한다", () => {
        expect(
            getVisibleStations(
                [
                    createStation({ id: "gs", brandCode: "GSC", price: 1_800 }),
                    createStation({ id: "sk", brandCode: "SKE", price: 1_700 }),
                    createStation({ id: "soil", brandCode: "SOL", price: 1_600 }),
                    createStation({ id: "other", brandCode: "HDO", price: 1_500 }),
                ],
                { localCurrencyOnly: false, selectedBrandCodes: ["GSC", "SOL"] },
            ).map((station) => station.id),
        ).toEqual(["soil", "gs"]);
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

    it("바텀 시트와 안전 여백을 제외한 지도 가시 영역을 계산한다", () => {
        expect(getVisibleMapArea({ width: 400, height: 800 }, 300)).toEqual({
            left: 48,
            top: 48,
            right: 352,
            bottom: 452,
        });
    });

    it("바텀 시트가 매우 높아도 지도 가시 영역 높이가 음수가 되지 않게 보정한다", () => {
        expect(getVisibleMapArea({ width: 320, height: 400 }, 380)).toEqual({
            left: 48,
            top: 48,
            right: 272,
            bottom: 48,
        });
    });

    it("주유소 픽셀 좌표가 바텀 시트 제외 가시 영역 안에 있는지 판단한다", () => {
        const visibleArea = getVisibleMapArea({ width: 400, height: 800 }, 300);

        expect(isContainerPointInsideRect({ x: 200, y: 400 }, visibleArea)).toBe(true);
        expect(isContainerPointInsideRect({ x: 200, y: 520 }, visibleArea)).toBe(false);
        expect(isContainerPointInsideRect({ x: 20, y: 400 }, visibleArea)).toBe(false);
    });

    it("주유소 픽셀 좌표가 가시 영역 안이면 중심 이동을 하지 않는다", () => {
        expect(getStationCenteringDecision({ x: 200, y: 400 }, { width: 400, height: 800 }, 300)).toEqual({
            shouldCenter: false,
        });
    });

    it("주유소 픽셀 좌표가 바텀 시트에 가려지면 가시 영역 중앙에 오도록 새 중심점을 계산한다", () => {
        expect(getStationCenteringDecision({ x: 200, y: 520 }, { width: 400, height: 800 }, 300)).toEqual({
            shouldCenter: true,
            nextCenterPoint: {
                x: 200,
                y: 670,
            },
        });
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
    brandCode = "SKE",
}: {
    id: string;
    price?: number;
    accepted?: boolean | null;
    brandCode?: string | null;
}): Station {
    return {
        id,
        name: id,
        price,
        brandCode,
        lat: 37.5,
        lng: 126.5,
        localCurrency: {
            accepted,
            status: accepted === true ? "ACCEPTED" : "NOT_ACCEPTED",
        },
    };
}
