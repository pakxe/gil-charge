import type { ContainerPoint, MapBounds, LatLng } from "@/shared/model/map";
import type { Station } from "@/shared/types/map";

export type StationSelectionSource = "map" | "list";

export const STATION_MARKER_SAFE_MARGIN_PX = 48;

type ContainerSize = {
    width: number;
    height: number;
};

type ContainerRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

type StationCenteringDecision =
    | {
          shouldCenter: false;
      }
    | {
          shouldCenter: true;
          nextCenterPoint: ContainerPoint;
      };

/**
 * 지도 마커와 바텀 시트가 같은 주유소 목록을 바라보도록 필터와 정렬을 한 곳에서 적용한다.
 */
export function getVisibleStations(stations: Station[], localCurrencyOnly: boolean) {
    const filteredStations = localCurrencyOnly
        ? stations.filter((station) => station.localCurrency?.accepted === true)
        : stations;

    return [...filteredStations].sort((a, b) => a.price - b.price);
}

/**
 * 필터 변경이나 새 검색 결과로 현재 선택된 주유소가 화면 표시 목록에서 사라졌는지 판단한다.
 */
export function shouldClearSelectedStation(selectedStationId: string | null, visibleStations: Station[]) {
    return selectedStationId !== null && visibleStations.every((station) => station.id !== selectedStationId);
}

/**
 * 리스트에서 주유소를 선택했을 때, 현재 지도 bounds 밖이라 지도 중심 이동이 필요한지 판단한다.
 */
export function shouldCenterStation(station: Pick<Station, "lat" | "lng">, bounds: MapBounds) {
    return !isLatLngInsideBounds(stationToLatLng(station), bounds);
}

/**
 * 바텀 시트와 마커 안전 여백을 제외하고 사용자가 실제로 볼 수 있는 지도 영역을 계산한다.
 */
export function getVisibleMapArea(
    containerSize: ContainerSize,
    bottomSheetHeight: number,
    safeMarginPx = STATION_MARKER_SAFE_MARGIN_PX,
): ContainerRect {
    const left = safeMarginPx;
    const top = safeMarginPx;

    return {
        left,
        top,
        right: Math.max(left, containerSize.width - safeMarginPx),
        bottom: Math.max(top, containerSize.height - bottomSheetHeight - safeMarginPx),
    };
}

/**
 * 주유소 마커가 실제 가시 영역 밖이면, 가시 영역 중앙에 오도록 만들 새 지도 중심점을 계산한다.
 */
export function getStationCenteringDecision(
    stationPoint: ContainerPoint,
    containerSize: ContainerSize,
    bottomSheetHeight: number,
    safeMarginPx = STATION_MARKER_SAFE_MARGIN_PX,
): StationCenteringDecision {
    const visibleArea = getVisibleMapArea(containerSize, bottomSheetHeight, safeMarginPx);

    if (isContainerPointInsideRect(stationPoint, visibleArea)) {
        return {
            shouldCenter: false,
        };
    }

    const containerCenterPoint = getContainerCenterPoint(containerSize);
    const visibleAreaCenterPoint = getRectCenterPoint(visibleArea);

    return {
        shouldCenter: true,
        nextCenterPoint: {
            x: containerCenterPoint.x + stationPoint.x - visibleAreaCenterPoint.x,
            y: containerCenterPoint.y + stationPoint.y - visibleAreaCenterPoint.y,
        },
    };
}

/**
 * 컨테이너 픽셀 좌표가 지정된 사각형 안에 있는지 판단한다.
 */
export function isContainerPointInsideRect(point: ContainerPoint, rect: ContainerRect) {
    return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

/**
 * Station 응답의 좌표 필드를 지도 어댑터가 사용하는 LatLng 형태로 변환한다.
 */
export function stationToLatLng(station: Pick<Station, "lat" | "lng">): LatLng {
    return {
        lat: station.lat,
        lng: station.lng,
    };
}

/**
 * 좌표가 지도 bounds 안에 있는지 판단한다. 경도 범위가 날짜변경선을 걸치는 경우도 포함한다.
 */
export function isLatLngInsideBounds(latLng: LatLng, bounds: MapBounds) {
    const isLatInside = latLng.lat >= bounds.southWest.lat && latLng.lat <= bounds.northEast.lat;
    const isLngInside =
        bounds.southWest.lng <= bounds.northEast.lng
            ? latLng.lng >= bounds.southWest.lng && latLng.lng <= bounds.northEast.lng
            : latLng.lng >= bounds.southWest.lng || latLng.lng <= bounds.northEast.lng;

    return isLatInside && isLngInside;
}

function getContainerCenterPoint(containerSize: ContainerSize): ContainerPoint {
    return {
        x: containerSize.width / 2,
        y: containerSize.height / 2,
    };
}

function getRectCenterPoint(rect: ContainerRect): ContainerPoint {
    return {
        x: (rect.left + rect.right) / 2,
        y: (rect.top + rect.bottom) / 2,
    };
}
