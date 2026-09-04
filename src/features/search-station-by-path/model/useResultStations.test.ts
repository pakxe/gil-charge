// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MapInstance } from "@/shared/model/map";
import type { Station } from "@/shared/model/map";
import { useResultStations } from "@/features/search-station-by-path/model/useResultStations";

describe("useResultStations", () => {
    it("브랜드 필터를 토글한다", () => {
        const { result } = renderHook(() => useResultStations({ map: null }));

        act(() => {
            result.current.replaceStations([
                createStation("ske", { brandCode: "SKE" }),
                createStation("gsc", { brandCode: "GSC" }),
            ]);
            result.current.toggleBrandFilter("GSC");
        });

        expect(result.current.brandCodes).toEqual(["SKE", "GSC"]);
        expect(result.current.filter.selectedBrandCodes).toEqual(["GSC"]);
        expect(result.current.visibleStations.map((station) => station.id)).toEqual(["gsc"]);
    });

    it("리스트 선택 시 선택된 주유소가 가려져 있으면 지도 중심을 이동한다", () => {
        const map = createMapMock();
        const { result } = renderHook(() => useResultStations({ map }));

        act(() => {
            result.current.replaceStations([createStation("station-1")]);
        });

        act(() => {
            result.current.selectStation({ stationId: "station-1", source: "list" }, 300);
        });

        expect(result.current.selectedStationId).toBe("station-1");
        expect(map.setCenter).toHaveBeenCalledWith({ lat: 37, lng: 127 });
    });

    it("현재 visible stations에 없는 주유소는 선택하지 않는다", () => {
        const { result } = renderHook(() => useResultStations({ map: null }));

        act(() => {
            result.current.replaceStations([createStation("station-1")]);
            result.current.selectStation({ stationId: "missing", source: "map" });
        });

        expect(result.current.selectedStationId).toBeNull();
    });
});

function createMapMock() {
    const container = document.createElement("div");

    Object.defineProperties(container, {
        clientWidth: { configurable: true, value: 400 },
        clientHeight: { configurable: true, value: 800 },
    });

    return {
        setCenter: vi.fn(),
        setZoom: vi.fn(),
        fitPoints: vi.fn(),
        getLevel: vi.fn(() => 8),
        getBounds: vi.fn(),
        panBy: vi.fn(),
        getContainer: vi.fn(() => container),
        latLngToContainerPoint: vi.fn(() => ({ x: 200, y: 520 })),
        containerPointToLatLng: vi.fn(() => ({ lat: 37, lng: 127 })),
        clientPointToLatLng: vi.fn(),
    } satisfies MapInstance;
}

function createStation(
    id: string,
    overrides: Partial<Pick<Station, "price" | "brandCode">> = {},
): Station {
    return {
        id,
        name: id,
        price: overrides.price ?? 1_700,
        brandCode: overrides.brandCode ?? "SKE",
        lat: 37.5,
        lng: 126.5,
    };
}
