import { describe, expect, it } from "vitest";

import type { Station } from "@/shared/types/map";
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

        expect(nextState.stations.map((station) => station.id)).toEqual(["station-2"]);
        expect(nextState.selection).toBeNull();
    });

    it("지역화폐 필터로 선택된 주유소가 보이지 않게 되면 선택을 해제한다", () => {
        const state = selectStationState([
            createStation("accepted", { accepted: true }),
            createStation("not-accepted", { accepted: false }),
        ], "not-accepted");

        const nextState = resultStationsReducer(state, {
            type: "LOCAL_CURRENCY_FILTER_CHANGED",
            enabled: true,
        });

        expect(nextState.filter.localCurrencyOnly).toBe(true);
        expect(nextState.selection).toBeNull();
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

    it("현재 필터에 보이지 않는 주유소는 선택하지 않는다", () => {
        const state = resultStationsReducer(
            resultStationsReducer(INITIAL_RESULT_STATIONS_STATE, {
                type: "STATIONS_REPLACED",
                stations: [createStation("not-accepted", { accepted: false })],
            }),
            { type: "LOCAL_CURRENCY_FILTER_CHANGED", enabled: true },
        );

        const nextState = resultStationsReducer(state, {
            type: "STATION_SELECTED",
            selection: { stationId: "not-accepted", source: "map" },
        });

        expect(nextState.selection).toBeNull();
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

        expect(getVisibleStations(stations, { localCurrencyOnly: false, selectedBrandCodes: [] })).toMatchObject([
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
    overrides: Partial<Pick<Station, "price" | "brandCode">> & { accepted?: boolean } = {},
): Station {
    const accepted = overrides.accepted ?? true;

    return {
        id,
        name: id,
        price: overrides.price ?? 1_700,
        brandCode: overrides.brandCode ?? "SKE",
        lat: 37.5,
        lng: 126.5,
        localCurrency: {
            accepted,
            status: accepted ? "ACCEPTED" : "NOT_ACCEPTED",
        },
    };
}
