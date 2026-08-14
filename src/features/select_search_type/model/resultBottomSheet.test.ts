import { describe, expect, it } from "vitest";

import {
    CLOSE_RESULT_SHEET_HEIGHT_PX,
    getResultSheetDefaultHeight,
    getResultSheetFullThreshold,
    getSearchControlsBottom,
    SEARCH_CONTROLS_IDLE_BOTTOM_PX,
    SEARCH_CONTROLS_SHEET_GAP_PX,
    snapResultSheetHeight,
} from "@/features/select_search_type/model/resultBottomSheet";

describe("resultBottomSheet", () => {
    it("기본 높이를 최대 높이의 절반으로 계산한다", () => {
        expect(getResultSheetDefaultHeight(900)).toBe(450);
    });

    it("200px 이하 높이는 닫힘으로 스냅한다", () => {
        expect(snapResultSheetHeight(CLOSE_RESULT_SHEET_HEIGHT_PX, 900)).toBe(0);
    });

    it("중간 높이보다 300px 이상 높으면 최대 높이로 스냅한다", () => {
        expect(getResultSheetFullThreshold(1_400)).toBe(1_000);
        expect(snapResultSheetHeight(1_000, 1_400)).toBe(1_400);
    });

    it("full threshold에 도달하기 전까지 현재 높이를 유지한다", () => {
        expect(getResultSheetFullThreshold(900)).toBe(750);
        expect(snapResultSheetHeight(749, 900)).toBe(749);
        expect(snapResultSheetHeight(750, 900)).toBe(900);
    });

    it("중간 영역에서는 현재 높이를 유지한다", () => {
        expect(snapResultSheetHeight(520, 1_000)).toBe(520);
    });

    it("검색 컨트롤 위치를 결과 유무에 따라 계산한다", () => {
        expect(getSearchControlsBottom(320, true)).toBe(320 + SEARCH_CONTROLS_SHEET_GAP_PX);
        expect(getSearchControlsBottom(320, false)).toBe(SEARCH_CONTROLS_IDLE_BOTTOM_PX);
    });
});
