// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useStationBrandFilter } from "@/features/search-station-by-path/model/useStationBrandFilter";
import type { Station } from "@/shared/types/map";

describe("useStationBrandFilter", () => {
    it("검색 결과의 브랜드 코드를 중복 제거해서 필터 목록으로 만든다", () => {
        const { result } = renderHook(() =>
            useStationBrandFilter([
                createStation("station-1", "SKE"),
                createStation("station-2", "GSC"),
                createStation("station-3", "SKE"),
                createStation("station-4", null),
            ]),
        );

        expect(result.current.brandFilterCodes).toEqual(["SKE", "GSC"]);
    });

    it("브랜드 코드를 다중 선택하고 다시 누르면 선택 해제한다", () => {
        const { result } = renderHook(() =>
            useStationBrandFilter([createStation("station-1", "SKE"), createStation("station-2", "GSC")]),
        );

        act(() => {
            result.current.toggleBrandCode("SKE");
            result.current.toggleBrandCode("GSC");
        });

        expect(result.current.selectedBrandCodes).toEqual(["SKE", "GSC"]);

        act(() => {
            result.current.toggleBrandCode("SKE");
        });

        expect(result.current.selectedBrandCodes).toEqual(["GSC"]);
    });

    it("현재 검색 결과에 없는 선택값은 선택 결과에서 제외한다", () => {
        const { result, rerender } = renderHook(({ stations }) => useStationBrandFilter(stations), {
            initialProps: {
                stations: [createStation("station-1", "SKE"), createStation("station-2", "GSC")],
            },
        });

        act(() => {
            result.current.toggleBrandCode("SKE");
            result.current.toggleBrandCode("GSC");
        });

        rerender({
            stations: [createStation("station-3", "GSC")],
        });

        expect(result.current.selectedBrandCodes).toEqual(["GSC"]);
    });
});

function createStation(id: string, brandCode: string | null): Station {
    return {
        id,
        name: id,
        price: 1_700,
        brandCode,
        lat: 37.5,
        lng: 126.5,
        localCurrency: {
            accepted: null,
            status: "UNKNOWN",
        },
    };
}
