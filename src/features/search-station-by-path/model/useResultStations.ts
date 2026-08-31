import { useCallback, useMemo, useReducer } from "react";

import type { MapInstance } from "@/shared/model/map";
import type { Station } from "@/shared/types/map";
import { centerStationOnMap } from "@/features/search-station-by-path/model/stationMap";
import {
    getBrandCodes,
    getVisibleStations,
    INITIAL_RESULT_STATIONS_STATE,
    resultStationsReducer,
    type ResultStationsAction,
    type StationSelection,
} from "@/features/search-station-by-path/model/resultStations";

type Params = {
    map: MapInstance | null;
};

export function useResultStations({ map }: Params) {
    const [state, dispatch] = useReducer(resultStationsReducer, INITIAL_RESULT_STATIONS_STATE);

    const visibleStations = useMemo(
        () => getVisibleStations(state.stations ?? [], state.filter),
        [state.filter, state.stations],
    );

    const replaceStations = useCallback((stations: Station[]) => {
        dispatch({ type: "STATIONS_REPLACED", stations });
    }, []);

    const close = useCallback(() => {
        dispatch({ type: "RESULT_CLOSED" });
    }, []);

    const selectStation = useCallback(
        (selection: StationSelection, bottomSheetVisibleHeight = 0) => {
            const station = visibleStations.find((candidate) => candidate.id === selection.stationId);

            if (!station) {
                return;
            }

            dispatch({ type: "STATION_SELECTED", selection });

            if (selection.source !== "list" || !map) {
                return;
            }

            centerStationOnMap({
                map,
                station,
                bottomSheetVisibleHeight,
            });
        },
        [map, visibleStations],
    );

    const toggleBrandFilter = useCallback((brandCode: string) => {
        const action: ResultStationsAction = {
            type: "BRAND_FILTER_TOGGLED",
            brandCode,
        };
        dispatch(action);
    }, []);

    const changeLocalCurrencyFilter = useCallback((enabled: boolean) => {
        const action: ResultStationsAction = {
            type: "LOCAL_CURRENCY_FILTER_CHANGED",
            enabled,
        };
        dispatch(action);
    }, []);

    return {
        stations: state.stations,
        visibleStations,
        filter: state.filter,
        brandCodes: getBrandCodes(state.stations ?? []),
        isOpen: state.isOpen,
        selectedStationId: state.selection?.stationId ?? null,
        selectionSource: state.selection?.source ?? null,
        replaceStations,
        selectStation,
        close,
        toggleBrandFilter,
        changeLocalCurrencyFilter,
    };
}
