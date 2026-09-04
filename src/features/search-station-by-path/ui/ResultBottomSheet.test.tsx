// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultBottomSheet } from "@/features/search-station-by-path/ui/ResultBottomSheet";

afterEach(cleanup);

describe("ResultBottomSheet", () => {
    it("검색 결과가 없으면 필터 영역을 표시하지 않는다", () => {
        renderResultBottomSheet(0);

        expect(screen.queryByRole("button", { name: "지역화폐" })).toBeNull();
        expect(screen.getByText("검색 결과가 없습니다.")).toBeTruthy();
    });

    it("필터 적용으로 표시 결과만 없으면 필터 영역을 유지한다", () => {
        renderResultBottomSheet(1);

        expect(screen.getByRole("button", { name: "지역화폐" })).toBeTruthy();
    });
});

function renderResultBottomSheet(totalStationCount: number) {
    render(
        <ResultBottomSheet
            containerRef={createRef<HTMLElement>()}
            maxHeight={600}
            stations={[]}
            totalStationCount={totalStationCount}
            filter={{ localCurrencyOnly: false, brandCodes: [], selectedBrandCodes: [] }}
            selection={{ selectedStationId: null, source: null }}
            visibleHeight={400}
            onVisibleHeightChange={vi.fn()}
            onLocalCurrencyOnlyChange={vi.fn()}
            onBrandFilterToggle={vi.fn()}
            onStationClick={vi.fn()}
            onClose={vi.fn()}
        />,
    );
}
