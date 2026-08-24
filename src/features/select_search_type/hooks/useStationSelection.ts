import { useCallback, useState } from "react";

import type { MapInstance } from "@/shared/model/map";
import type { Station } from "@/shared/types/map";
import {
    getStationCenteringDecision,
    getVisibleStations,
    shouldClearSelectedStation,
    stationToLatLng,
    type StationSelectionSource,
} from "@/features/select_search_type/model/stationSelection";

type Params = {
    map: MapInstance | null;
    stations: Station[] | null;
    visibleStations: Station[];
};

export function useStationSelection({ map, stations, visibleStations }: Params) {
    const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
    const [selectionSource, setSelectionSource] = useState<StationSelectionSource | null>(null);
    const [selectionRevision, setSelectionRevision] = useState(0);

    const clearSelectedStation = useCallback(() => {
        setSelectedStationId(null);
        setSelectionSource(null);
        setSelectionRevision(0);
    }, []);

    const selectStation = useCallback(
        (source: StationSelectionSource, stationId: string, bottomSheetVisibleHeight = 0) => {
            setSelectedStationId(stationId);
            setSelectionSource(source);
            setSelectionRevision((prev) => prev + 1);

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
            const centeringDecision = getStationCenteringDecision(stationPoint, containerSize, bottomSheetVisibleHeight);

            if (centeringDecision.shouldCenter) {
                map.setCenter(map.containerPointToLatLng(centeringDecision.nextCenterPoint));
            }
        },
        [map, visibleStations],
    );

    const handleLocalCurrencyOnlyChange = useCallback(
        (nextLocalCurrencyOnly: boolean) => {
            const nextVisibleStations = stations ? getVisibleStations(stations, nextLocalCurrencyOnly) : [];

            if (!shouldClearSelectedStation(selectedStationId, nextVisibleStations)) return;

            clearSelectedStation();
        },
        [clearSelectedStation, selectedStationId, stations],
    );

    return {
        selectedStationId,
        selectionSource,
        selectionRevision,
        selectStation,
        clearSelectedStation,
        handleLocalCurrencyOnlyChange,
    };
}
