import { LatLng } from "@/shared/model/map";

export type StrokeStyle =
    | "solid"
    | "shortdash"
    | "shortdot"
    | "shortdashdot"
    | "shortdashdotdot"
    | "dot"
    | "dash"
    | "dashed"
    | "dashdot"
    | "longdash"
    | "longdashdot"
    | "longdashdotdot";

export type MapPolylineInterface = {
    path: LatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: StrokeStyle;
    zIndex?: number;
    onClick?: () => void;
};
