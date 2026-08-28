import { describe, expect, it } from "vitest";

import {
    CLOSE_RESULT_SHEET_HEIGHT_PX,
    FULL_RESULT_SHEET_EXTRA_HEIGHT_PX,
    getResultSheetDefaultHeight,
    getResultSheetFullThreshold,
    getSearchControlsBottom,
    SEARCH_CONTROLS_IDLE_BOTTOM_PX,
    SEARCH_CONTROLS_SHEET_GAP_PX,
    snapResultSheetHeight,
} from "@/features/search-station-by-path/model/resultBottomSheet";

describe("resultBottomSheet", () => {
    it("기본 높이를 최대 높이의 절반으로 계산한다", () => {
        expect(getResultSheetDefaultHeight(900)).toBe(450);
    });

    it(`${CLOSE_RESULT_SHEET_HEIGHT_PX}px 이하 높이는 닫힘으로 스냅한다`, () => {
        expect(snapResultSheetHeight(CLOSE_RESULT_SHEET_HEIGHT_PX, 900)).toBe(0);
    });

    it("닫힘 기준보다 높으면 현재 높이를 유지한다", () => {
        expect(snapResultSheetHeight(CLOSE_RESULT_SHEET_HEIGHT_PX + 1, 900)).toBe(CLOSE_RESULT_SHEET_HEIGHT_PX + 1);
    });

    it(`중간 높이보다 ${FULL_RESULT_SHEET_EXTRA_HEIGHT_PX}px 이상 높으면 최대 높이로 스냅한다`, () => {
        const fullThreshold = getResultSheetDefaultHeight(1_400) + FULL_RESULT_SHEET_EXTRA_HEIGHT_PX;

        expect(getResultSheetFullThreshold(1_400)).toBe(fullThreshold);
        expect(snapResultSheetHeight(fullThreshold, 1_400)).toBe(1_400);
    });

    it("full threshold에 도달하기 전까지 현재 높이를 유지한다", () => {
        const fullThreshold = getResultSheetDefaultHeight(900) + FULL_RESULT_SHEET_EXTRA_HEIGHT_PX;

        expect(getResultSheetFullThreshold(900)).toBe(fullThreshold);
        expect(snapResultSheetHeight(fullThreshold - 1, 900)).toBe(fullThreshold - 1);
        expect(snapResultSheetHeight(fullThreshold, 900)).toBe(900);
    });

    it("중간 영역에서는 현재 높이를 유지한다", () => {
        expect(snapResultSheetHeight(520, 1_000)).toBe(520);
    });

    it("검색 컨트롤 위치를 결과 유무에 따라 계산한다", () => {
        expect(getSearchControlsBottom(320, true)).toBe(320 + SEARCH_CONTROLS_SHEET_GAP_PX);
        expect(getSearchControlsBottom(320, false)).toBe(SEARCH_CONTROLS_IDLE_BOTTOM_PX);
    });
});
