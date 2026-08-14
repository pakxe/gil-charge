import type { MapBounds, LatLng } from "@/shared/model/map";
import type { Station } from "@/shared/types/map";

export type StationSelectionSource = "map" | "list";

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
