import type { MapInstance } from "@/shared/model/map";
import type { Station } from "@/shared/types/map";
import { getStationCenteringDecision, stationToLatLng } from "@/features/search-station-by-path/model/resultStations";

export function centerStationOnMap({
    map,
    station,
    bottomSheetVisibleHeight,
}: {
    map: MapInstance;
    station: Station;
    bottomSheetVisibleHeight: number;
}) {
    const mapContainer = map.getContainer();
    const containerSize = {
        width: mapContainer.clientWidth,
        height: mapContainer.clientHeight,
    };

    if (containerSize.height <= 0 || containerSize.width <= 0) {
        return;
    }

    const stationPoint = map.latLngToContainerPoint(stationToLatLng(station));
    const centeringDecision = getStationCenteringDecision(stationPoint, containerSize, bottomSheetVisibleHeight);

    if (centeringDecision.shouldCenter) {
        map.setCenter(map.containerPointToLatLng(centeringDecision.nextCenterPoint));
    }
}
