import type { ContainerPoint, MapBounds, LatLng } from "@/shared/model/map";
import type { Station } from "@/shared/types/map";

export type StationSelectionSource = "map" | "list";

export type StationFilter = {
    localCurrencyOnly: boolean;
    selectedBrandCodes: string[];
};

export type StationSelection = {
    stationId: string;
    source: StationSelectionSource;
};

export type ResultStationsState = {
    stations: Station[];
    filter: StationFilter;
    selection: StationSelection | null;
};

export const INITIAL_RESULT_STATIONS_STATE: ResultStationsState = {
    stations: [],
    filter: {
        localCurrencyOnly: false,
        selectedBrandCodes: [],
    },
    selection: null,
};

export type ResultStationsAction =
    | { type: "STATIONS_REPLACED"; stations: Station[] }
    | { type: "LOCAL_CURRENCY_FILTER_CHANGED"; enabled: boolean }
    | { type: "BRAND_FILTER_TOGGLED"; brandCode: string }
    | { type: "STATION_SELECTED"; selection: StationSelection }
    | { type: "SELECTION_CLEARED" };

// 가격 정렬도 사이드이펙트로 되고있음. 지금은 문제가 없지만 나중에는 어떻게 될지 모르므로 염두
export function getVisibleStations(stations: Station[], filter: StationFilter) {
    const selectedBrandCodeSet = new Set(filter.selectedBrandCodes);

    return stations
        .filter((station) => {
            if (filter.localCurrencyOnly && station.localCurrency.accepted !== true) {
                return false;
            }

            return selectedBrandCodeSet.size === 0 || selectedBrandCodeSet.has(station.brandCode ?? "");
        })
        .sort((a, b) => a.price - b.price);
}

export function getBrandCodes(stations: Station[]) {
    return Array.from(new Set(stations.map((station) => station.brandCode).filter(isBrandCode)));
}

export function keepSelectionIfVisible(selection: StationSelection | null, visibleStations: Station[]) {
    if (selection === null) {
        return null;
    }

    return visibleStations.some((station) => station.id === selection.stationId) ? selection : null;
}

export function shouldClearSelectedStation(selectedStationId: string | null, visibleStations: Station[]) {
    return selectedStationId !== null && !visibleStations.some((station) => station.id === selectedStationId);
}

export function resultStationsReducer(state: ResultStationsState, action: ResultStationsAction): ResultStationsState {
    switch (action.type) {
        case "STATIONS_REPLACED":
            return replaceStations(state, action.stations);

        case "LOCAL_CURRENCY_FILTER_CHANGED":
            return changeLocalCurrencyFilter(state, action.enabled);

        case "BRAND_FILTER_TOGGLED":
            return toggleBrandFilter(state, action.brandCode);

        case "STATION_SELECTED":
            return selectStation(state, action.selection);

        case "SELECTION_CLEARED":
            return { ...state, selection: null };
    }
}

function selectStation(state: ResultStationsState, selection: StationSelection): ResultStationsState {
    const visibleStations = getVisibleStations(state.stations, state.filter);

    return {
        ...state,
        selection: keepSelectionIfVisible(selection, visibleStations),
    };
}

function toggleBrandFilter(state: ResultStationsState, brandCode: string): ResultStationsState {
    const selectedBrandCodes = state.filter.selectedBrandCodes.includes(brandCode)
        ? state.filter.selectedBrandCodes.filter((code) => code !== brandCode)
        : [...state.filter.selectedBrandCodes, brandCode];

    const filter = {
        ...state.filter,
        selectedBrandCodes,
    };

    return {
        ...state,
        filter,
        selection: keepSelectionIfVisible(state.selection, getVisibleStations(state.stations, filter)),
    };
}

function changeLocalCurrencyFilter(state: ResultStationsState, enabled: boolean): ResultStationsState {
    const filter = {
        ...state.filter,
        localCurrencyOnly: enabled,
    };

    return {
        ...state,
        filter,
        selection: keepSelectionIfVisible(state.selection, getVisibleStations(state.stations, filter)),
    };
}

function replaceStations(state: ResultStationsState, stations: Station[]): ResultStationsState {
    const availableBrandCodes = new Set(getBrandCodes(stations));
    const selectedBrandCodes = state.filter.selectedBrandCodes.filter((brandCode) =>
        availableBrandCodes.has(brandCode),
    );

    return {
        ...state,
        stations,
        filter: {
            ...state.filter,
            selectedBrandCodes,
        },
        selection: null,
    };
}

function isBrandCode(brandCode: string | null): brandCode is string {
    return brandCode !== null;
}

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

type StationCenteringDecision = { shouldCenter: false } | { shouldCenter: true; nextCenterPoint: ContainerPoint };

export function shouldCenterStation(station: Pick<Station, "lat" | "lng">, bounds: MapBounds) {
    return !isLatLngInsideBounds(stationToLatLng(station), bounds);
}

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

export function getStationCenteringDecision(
    stationPoint: ContainerPoint,
    containerSize: ContainerSize,
    bottomSheetHeight: number,
    safeMarginPx = STATION_MARKER_SAFE_MARGIN_PX,
): StationCenteringDecision {
    const visibleArea = getVisibleMapArea(containerSize, bottomSheetHeight, safeMarginPx);

    if (isContainerPointInsideRect(stationPoint, visibleArea)) {
        return { shouldCenter: false };
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

export function isContainerPointInsideRect(point: ContainerPoint, rect: ContainerRect) {
    return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

export function stationToLatLng(station: Pick<Station, "lat" | "lng">): LatLng {
    return { lat: station.lat, lng: station.lng };
}

export function isLatLngInsideBounds(latLng: LatLng, bounds: MapBounds) {
    const isLatInside = latLng.lat >= bounds.southWest.lat && latLng.lat <= bounds.northEast.lat;
    const isLngInside =
        bounds.southWest.lng <= bounds.northEast.lng
            ? latLng.lng >= bounds.southWest.lng && latLng.lng <= bounds.northEast.lng
            : latLng.lng >= bounds.southWest.lng || latLng.lng <= bounds.northEast.lng;

    return isLatInside && isLngInside;
}

function getContainerCenterPoint(containerSize: ContainerSize): ContainerPoint {
    return { x: containerSize.width / 2, y: containerSize.height / 2 };
}

function getRectCenterPoint(rect: ContainerRect): ContainerPoint {
    return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
}
