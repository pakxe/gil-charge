import { LatLng } from "@/shared/model/map";
import { ReactNode } from "react";

export type MapMarkerInterface = {
    children: ReactNode;
    position: LatLng;
};
