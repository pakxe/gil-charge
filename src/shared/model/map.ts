import { ReactNode } from "react";

export type LatLng = {
    lat: number;
    lng: number;
};

export type MapBounds = {
    southWest: LatLng;
    northEast: LatLng;
};

export type ContainerPoint = {
    x: number;
    y: number;
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

    // UI
    loadingFallback: ReactNode;
    errorFallback: ReactNode;
    children?: ReactNode;

    // style
    className?: string;
};

// 특정 지도 공급자(Kakao, Naver, Google)가 생성한 실제 지도 인스턴스/객체
export type MapInstance = {
    setCenter(latLng: LatLng): void;
    setZoom(level: number): void;
    getLevel(): number;
    getBounds(): MapBounds;
    panBy(deltaX: number, deltaY: number): void;
    getContainer(): HTMLElement;
    latLngToContainerPoint(latLng: LatLng): ContainerPoint;
    containerPointToLatLng(point: ContainerPoint): LatLng;
    clientPointToLatLng(clientX: number, clientY: number): LatLng;
};

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
