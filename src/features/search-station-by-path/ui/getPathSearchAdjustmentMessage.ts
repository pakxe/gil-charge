import {
    MAX_PATH_SEARCH_WAYPOINT_COUNT,
    PATH_SEARCH_RADIUS_STEP_KM,
    type PathSearchAdjustment,
} from "@/features/search-station-by-path/model/pathSearchState";

export function getPathSearchAdjustmentMessage(adjustment: PathSearchAdjustment): string | null {
    if (!adjustment.waypointCount && !adjustment.radius) return null;

    if (adjustment.waypointCount && adjustment.radius) {
        return `웨이포인트는 앞의 ${MAX_PATH_SEARCH_WAYPOINT_COUNT}개만 사용하며 반경은 허용 범위로 조정했습니다.`;
    }

    if (adjustment.waypointCount) {
        return `웨이포인트는 최대 ${MAX_PATH_SEARCH_WAYPOINT_COUNT}개까지만 사용합니다.`;
    }

    return `반경을 허용 범위와 ${PATH_SEARCH_RADIUS_STEP_KM}km 단위로 조정했습니다.`;
}
