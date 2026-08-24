import { useCallback, useEffect, useRef, useState } from "react";
import { searchStationsByPath, type SearchStationsByPathBackendErrorCode } from "@/shared/api/stationApi";
import { type ClientRequestFailureCode, RequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";
import { PathSet, Station } from "@/shared/types/map";

type StationsSearchInput = {
    paths: PathSet[];
    radiusKm: number;
};

export type StationsSearchFailurePolicy = {
    presentation: "inline" | "toast" | "silent";
    recovery: "edit-input" | "manual-retry" | "none";
    report: "none" | "always";
};

type StationsSearchFailureCode = SearchStationsByPathBackendErrorCode | ClientRequestFailureCode;

export type StationsSearchState =
    | {
          status: "idle";
          stations: null;
          failure: null;
          policy: null;
      }
    | {
          status: "loading";
          stations: Station[] | null;
          failure: null;
          policy: null;
      }
    | {
          status: "success";
          stations: Station[];
          failure: null;
          policy: null;
      }
    | {
          status: "error";
          stations: Station[] | null;
          failure: RequestFailure;
          policy: StationsSearchFailurePolicy;
      };

const INITIAL_STATIONS_SEARCH_STATE: StationsSearchState = {
    status: "idle",
    stations: null,
    failure: null,
    policy: null,
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
            policy: null,
        }));

        try {
            const stations = await searchStationsByPath({ paths: allPaths, radiusKm });

            setState({
                status: "success",
                stations,
                failure: null,
                policy: null,
            });
        } catch (error) {
            const requestFailure = toRequestFailure(error);
            const policy = decideStationsSearchFailurePolicy(requestFailure.code);
            failedSearchInputRef.current = {
                paths: allPaths,
                radiusKm,
            };
            setState((current) => ({
                status: "error",
                stations: current.stations,
                failure: requestFailure,
                policy,
            }));
        }
    }, []);

    useEffect(() => {
        searchRef.current = search;
    }, [search]);

    return { state, retry, search };
}

function decideStationsSearchFailurePolicy(code: string): StationsSearchFailurePolicy {
    switch (code as StationsSearchFailureCode) {
        case "INVALID_INPUT":
        case "PAYLOAD_TOO_LARGE":
            return {
                presentation: "inline",
                recovery: "edit-input",
                report: "none",
            };

        case "OFFLINE":
            return {
                presentation: "toast",
                recovery: "manual-retry",
                report: "none",
            };

        case "NETWORK_ERROR":
        case "TIMEOUT":
        case "OPINET_UNAVAILABLE":
        case "DATABASE_UNAVAILABLE":
        case "INTERNAL_SERVER_ERROR":
            return {
                presentation: "toast",
                recovery: "manual-retry",
                report: "always",
            };

        case "ROUTE_NOT_FOUND":
        case "METHOD_NOT_ALLOWED":
        case "CONFIGURATION_ERROR":
        case "INVALID_RESPONSE":
        case "UNKNOWN_ERROR":
            return {
                presentation: "toast",
                recovery: "none",
                report: "always",
            };

        case "REQUEST_CANCELED":
            return {
                presentation: "silent",
                recovery: "none",
                report: "none",
            };

        default:
            return {
                presentation: "toast",
                recovery: "none",
                report: "always",
            };
    }
}
