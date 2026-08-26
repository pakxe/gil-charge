import { useCallback, useEffect, useRef, useState } from "react";
import { searchStationsByPath, type SearchStationsByPathErrorCode } from "@/shared/api/stations/searchStationsByPath";
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

type StationsSearchFailureCode = SearchStationsByPathErrorCode | ClientRequestFailureCode;

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
    const abortControllerRef = useRef<AbortController | null>(null);

    const search = useCallback(async (allPaths: PathSet[], radiusKm: number) => {
        abortControllerRef.current?.abort();

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        failedSearchInputRef.current = null;
        setState((current) => ({
            status: "loading",
            stations: current.stations,
            failure: null,
            policy: null,
        }));

        try {
            const stations = await searchStationsByPath({
                paths: allPaths,
                radiusKm,
                signal: abortController.signal,
            });

            if (abortController.signal.aborted) return;

            setState({
                status: "success",
                stations,
                failure: null,
                policy: null,
            });
        } catch (error) {
            if (abortController.signal.aborted) return;

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
        } finally {
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const retry = useCallback(() => {
        const failedSearchInput = failedSearchInputRef.current;

        if (!failedSearchInput) return;

        void search(failedSearchInput.paths, failedSearchInput.radiusKm);
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
