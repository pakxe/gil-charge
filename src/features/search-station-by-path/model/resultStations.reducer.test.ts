import { describe, expect, it } from "vitest";

import type { Station } from "@/shared/model/map";
import {
    getBrandCodes,
    getVisibleStations,
    INITIAL_RESULT_STATIONS_STATE,
    resultStationsReducer,
} from "@/features/search-station-by-path/model/resultStations";

describe("resultStationsReducer", () => {
    it("새 검색 결과를 저장하고 기존 결과 선택을 초기화한다", () => {
        const selectedState = resultStationsReducer(
            resultStationsReducer(INITIAL_RESULT_STATIONS_STATE, {
                type: "STATIONS_REPLACED",
                stations: [createStation("station-1")],
            }),
            { type: "STATION_SELECTED", selection: { stationId: "station-1", source: "map" } },
        );

        const nextState = resultStationsReducer(selectedState, {
            type: "STATIONS_REPLACED",
            stations: [createStation("station-2")],
        });

        expect(nextState.stations?.map((station) => station.id)).toEqual(["station-2"]);
        expect(nextState.selection).toBeNull();
    });

    it("URL에서 복원한 브랜드 필터를 응답에 해당 브랜드가 없어도 유지한다", () => {
        const filteredState = resultStationsReducer(INITIAL_RESULT_STATIONS_STATE, {
            type: "FILTER_REPLACED",
            filter: { selectedBrandCodes: ["GSC"] },
        });

        const nextState = resultStationsReducer(filteredState, {
            type: "STATIONS_REPLACED",
            stations: [createStation("ske", { brandCode: "SKE" })],
        });

        expect(nextState.filter.selectedBrandCodes).toEqual(["GSC"]);
        expect(getVisibleStations(nextState.stations ?? [], nextState.filter)).toEqual([]);
    });

    it("브랜드 필터를 적용해도 선택된 주유소가 보이면 선택을 유지한다", () => {
        const state = selectStationState(
            [
                createStation("ske", { brandCode: "SKE" }),
                createStation("gsc", { brandCode: "GSC" }),
            ],
            "ske",
        );

        const nextState = resultStationsReducer(state, {
            type: "BRAND_FILTER_TOGGLED",
            brandCode: "SKE",
        });

        expect(nextState.filter.selectedBrandCodes).toEqual(["SKE"]);
        expect(nextState.selection).toEqual({ stationId: "ske", source: "map" });
    });

    it("브랜드 코드는 중복과 null을 제거한다", () => {
        expect(
            getBrandCodes([
                createStation("ske-1", { brandCode: "SKE" }),
                createStation("ske-2", { brandCode: "SKE" }),
                createStation("unknown", { brandCode: null }),
                createStation("gsc", { brandCode: "GSC" }),
            ]),
        ).toEqual(["SKE", "GSC"]);
    });

    it("visible stations를 가격 오름차순으로 반환하고 원본 배열은 변경하지 않는다", () => {
        const stations = [
            createStation("expensive", { price: 1_800 }),
            createStation("cheap", { price: 1_600 }),
        ];

        expect(getVisibleStations(stations, { selectedBrandCodes: [] })).toMatchObject([
            { id: "cheap" },
            { id: "expensive" },
        ]);
        expect(stations.map((station) => station.id)).toEqual(["expensive", "cheap"]);
    });
});

function selectStationState(stations: Station[], stationId: string) {
    const state = resultStationsReducer(INITIAL_RESULT_STATIONS_STATE, {
        type: "STATIONS_REPLACED",
        stations,
    });

    return resultStationsReducer(state, {
        type: "STATION_SELECTED",
        selection: { stationId, source: "map" },
    });
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
