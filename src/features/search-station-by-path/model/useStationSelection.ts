import { useCallback, useEffect, useState } from "react";

import type { MapInstance } from "@/shared/model/map";
import type { Station } from "@/shared/types/map";
import {
    getStationCenteringDecision,
    stationToLatLng,
    type StationSelectionSource,
} from "@/features/search-station-by-path/model/stationSelection";

type Params = {
    map: MapInstance | null;
    visibleStations: Station[];
};

// selectedStationId가 현재 선택 가능한 stations 안에 존재해야한다. 그리고 그렇게만 변해야한다.
export function useStationSelection({ map, visibleStations }: Params) {
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
    const [selectionSource, setSelectionSource] = useState<StationSelectionSource | null>(null);

    const clearSelectedStation = useCallback(() => {
        setSelectedStationId(null);
        setSelectionSource(null);
    }, []);

    const selectStation = useCallback(
        (source: StationSelectionSource, stationId: string, bottomSheetVisibleHeight = 0) => {
            setSelectedStationId(stationId);
            setSelectionSource(source);

            if (source !== "list" || !map) return;

            const station = visibleStations.find((visibleStation) => visibleStation.id === stationId);
            if (!station) return;

            const mapContainer = map.getContainer();
            const containerSize = {
                width: mapContainer.clientWidth,
                height: mapContainer.clientHeight,
            };

            if (containerSize.width <= 0 || containerSize.height <= 0) return;

            const stationPoint = map.latLngToContainerPoint(stationToLatLng(station));
            const centeringDecision = getStationCenteringDecision(
                stationPoint,
                containerSize,
                bottomSheetVisibleHeight,
            );

            if (centeringDecision.shouldCenter) {
                map.setCenter(map.containerPointToLatLng(centeringDecision.nextCenterPoint));
            }
        },
        [map, visibleStations],
    );

    return {
        selectedStationId,
        selectionSource,
        selectStation,
        clearSelectedStation,
    };
}
