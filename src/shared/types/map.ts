import { PointerEventHandler } from "react";

export type LatLng = {
    // 가로 세로
    lat: number;
    lng: number;
};

export type MapInterface<EventElement extends HTMLDivElement = HTMLDivElement> = {
    center: LatLng;
    zoomLevel?: number;

    isDraggable?: boolean;

    onPointerDown?: PointerEventHandler<EventElement>;
    onPointerMove?: PointerEventHandler<EventElement>;
    onPointerUp?: PointerEventHandler<EventElement>;
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
