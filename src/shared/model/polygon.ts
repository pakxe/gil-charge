import type { LatLng } from "@/shared/model/map";
import type { StrokeStyle } from "@/shared/model/polyline";

export type MapPolygonInterface = {
    path: LatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: StrokeStyle;
    fillColor?: string;
    fillOpacity?: number;
    zIndex?: number;
    onClick?: (latLng: LatLng) => void;
    onMouseDown?: (latLng: LatLng) => void;
    onMouseMove?: (latLng: LatLng) => void;
};
