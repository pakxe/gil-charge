import { LatLng } from "@/shared/model/map";

export type StrokeStyle = "solid" | "dot" | "dash" | "dashed";
// | "dashdot"
// | "longdash"
// | "longdashdot"
// | "longdashdotdot";
// | "shortdash"
// | "shortdot"
// | "shortdashdot"
// | "shortdashdotdot"

export type MapPolylineInterface = {
    path: LatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: StrokeStyle;
    zIndex?: number;
    onClick?: () => void;
};
