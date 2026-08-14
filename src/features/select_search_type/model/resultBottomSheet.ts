export const DEFAULT_RESULT_SHEET_HEIGHT_RATIO = 0.5;
export const CLOSE_RESULT_SHEET_HEIGHT_PX = 200;
export const FULL_RESULT_SHEET_EXTRA_HEIGHT_PX = 300;
export const SEARCH_CONTROLS_SHEET_GAP_PX = 20;
export const SEARCH_CONTROLS_IDLE_BOTTOM_PX = 40;

/**
 * 검색 성공 후 처음 열리는 높이입니다.
 * 지도 조작과 결과 확인을 동시에 할 수 있도록 화면 절반을 기본값으로 둡니다.
 */
export function getResultSheetDefaultHeight(maxHeight: number) {
    return maxHeight * DEFAULT_RESULT_SHEET_HEIGHT_RATIO;
}

/**
 * 사용자가 중간 높이보다 충분히 더 올렸다면 full open 의도로 봅니다.
 * maxHeight보다 큰 threshold는 도달할 수 없으므로 최대 높이로 낮춰 계산합니다.
 */
export function getResultSheetFullThreshold(maxHeight: number) {
    return Math.min(maxHeight, getResultSheetDefaultHeight(maxHeight) + FULL_RESULT_SHEET_EXTRA_HEIGHT_PX);
}

/**
 * 드래그 종료 시점의 높이를 close/current/full 중 하나로 확정합니다.
 * 닫힘은 낮은 절대 높이 기준, full open은 기본 중간 높이에서 추가로 올린 거리 기준입니다.
 */
export function snapResultSheetHeight(visibleHeight: number, maxHeight: number) {
    if (maxHeight <= 0) return 0;

    const clampedVisibleHeight = clamp(visibleHeight, 0, maxHeight);

    if (clampedVisibleHeight <= CLOSE_RESULT_SHEET_HEIGHT_PX) {
        return 0;
    }

    if (clampedVisibleHeight >= getResultSheetFullThreshold(maxHeight)) {
        return maxHeight;
    }

    return clampedVisibleHeight;
}

/**
 * 반경/찾기 컨트롤은 결과가 없을 때는 화면 하단에, 결과가 있을 때는 시트 상단 20px 위에 붙습니다.
 * 시트가 full open되면 bottom 값이 화면 높이를 넘어서 컨트롤이 자연스럽게 화면 밖으로 밀려납니다.
 */
export function getSearchControlsBottom(visibleHeight: number, hasSearchResult: boolean) {
    return hasSearchResult ? visibleHeight + SEARCH_CONTROLS_SHEET_GAP_PX : SEARCH_CONTROLS_IDLE_BOTTOM_PX;
}

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
