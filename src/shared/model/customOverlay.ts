import { LatLng } from "@/shared/model/map";
import { ReactNode } from "react";

export type MapCustomOverlayInterface = {
    children: ReactNode;
    position: LatLng;
    clickable?: boolean;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
};
