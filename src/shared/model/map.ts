export type LatLng = {
    lat: number;
    lng: number;
};

export type MapInterface = {
    center: LatLng;
    zoomLevel?: number;
    isDraggable?: boolean;
    isZoomable?: boolean;

    onZoomLevelChange?: (zoomLevel: number) => void;
    onClick?: (latLng: LatLng) => void;
    onDragStart?: (latLng: LatLng) => void;
    onDragMove?: (latLng: LatLng) => void;
    onDragEnd?: (latLng: LatLng) => void;
};

// 특정 지도 공급자(Kakao, Naver, Google)가 생성한 실제 지도 인스턴스/객체
export type MapInstance = {
    setCenter(latLng: LatLng): void;
    setZoom(level: number): void;
    destroy(): void;
};
