import { useCallback, useEffect, useRef, useState } from "react";
import { searchStationsByPath } from "@/shared/api/stationApi";
import { RequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";
import { PathSet, Station } from "@/shared/types/map";

type StationsSearchInput = {
    paths: PathSet[];
    radiusKm: number;
};

export type StationsSearchState =
    | {
          status: "idle";
          stations: null;
          failure: null;
      }
    | {
          status: "loading";
          stations: Station[] | null;
          failure: null;
      }
    | {
          status: "success";
          stations: Station[];
          failure: null;
      }
    | {
          status: "error";
          stations: Station[] | null;
          failure: RequestFailure;
      };

const INITIAL_STATIONS_SEARCH_STATE: StationsSearchState = {
    status: "idle",
    stations: null,
    failure: null,
};

export function useStationsSearch() {
    const [state, setState] = useState<StationsSearchState>(INITIAL_STATIONS_SEARCH_STATE);
    const failedSearchInputRef = useRef<StationsSearchInput | null>(null);
    const searchRef = useRef<((paths: PathSet[], radiusKm: number) => Promise<void>) | null>(null);

    const retry = useCallback(() => {
        const failedSearchInput = failedSearchInputRef.current;

        if (!failedSearchInput || !searchRef.current) return;

        void searchRef.current(failedSearchInput.paths, failedSearchInput.radiusKm);
    }, []);

    const search = useCallback(async (allPaths: PathSet[], radiusKm: number) => {
        failedSearchInputRef.current = null;
        setState((current) => ({
            status: "loading",
            stations: current.stations,
            failure: null,
        }));

        try {
            const stations = await searchStationsByPath({ paths: allPaths, radiusKm });

            setState({
                status: "success",
                stations,
                failure: null,
            });
        } catch (error) {
            const requestFailure = toRequestFailure(error);
            failedSearchInputRef.current = {
                paths: allPaths,
                radiusKm,
            };
            setState((current) => ({
                status: "error",
                stations: current.stations,
                failure: requestFailure,
            }));
        }
    }, []);

    useEffect(() => {
        searchRef.current = search;
    }, [search]);

    return { state, retry, search };
}
