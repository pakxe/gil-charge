export type LatLng = {
    // 가로 세로
    lat: number;
    lng: number;
};

/**
 * Map관련 도메인 용어 정의
 * zoomLevel: 지도의 확대 정도
 * center: 카카오지도에서 말하는 center. default 위치라고 생각하면 됨
 * currentLocation: 실제 사용자 GPS 위치
 */
export type MapInterface = {
    center: LatLng;
    currentLocation?: LatLng;
    zoomLevel?: number;
    isDraggable?: boolean;
    isTracking?: boolean;

    onZoomLevelChange?: (zoomLevel: number) => void;
    onClick?: (latLng: LatLng) => void;
    onDragStart?: (latLng: LatLng) => void;
    onDragMove?: (latLng: LatLng) => void;
    onDragEnd?: () => void;
};
// 넘사벽

export interface Station {
    id: string;
    name: string;
    price: number;
    brandCode: string | null;
    lat: number;
    lng: number;
    localCurrency: {
        accepted: boolean | null;
        status: "UNKNOWN" | "ACCEPTED" | "NOT_ACCEPTED" | "OUT_OF_SCOPE" | "MISSING_ROAD_ADDRESS" | "ERROR";
        roadAddress?: string | null;
        storeName?: string | null;
        currencyName?: string | null;
        industryCode?: string | null;
    };
}

export type DrawingType = "pen" | "waypoint";
export type PathSet = { id: string; type: DrawingType; points: LatLng[] };
