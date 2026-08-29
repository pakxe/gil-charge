import { LatLng } from "@/shared/types/map";

export const DEFAULT_MAP_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };

export const MAP_Z_INDEX = {
    lasso: 20,
    searchStationByPath: 30,
    selectedWaypoint: 31,
    waypoint: 30,
    stationMarkerDefault: 32,
    stationMakerSelected: 40,
    currentLocation: 45,
};
