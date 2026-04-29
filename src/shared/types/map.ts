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
    lat: number;
    lng: number;
    brand: string;
}

export type DrawingType = "pen" | "waypoint";
export type PathSet = { id: string; type: DrawingType; points: LatLng[] };
export type Tool = "pen" | "waypoint" | "eraser";
