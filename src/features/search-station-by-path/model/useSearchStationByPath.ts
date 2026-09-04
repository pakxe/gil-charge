import { useCallback, useEffect, useRef, useState } from "react";
import { searchStationByPath, type SearchStationByPathErrorCode } from "@/features/search-station-by-path/api/searchStationByPath";
import { type ClientRequestFailureCode, RequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";
import { PathSet, Station } from "@/shared/model/map";

type SearchStationByPathInput = {
    paths: PathSet[];
    radiusKm: number;
};

export type SearchStationByPathFailurePolicy = {
    presentation: "inline" | "toast" | "silent";
    recovery: "edit-input" | "manual-retry" | "none";
    report: "none" | "always";
};

type SearchStationByPathFailureCode = SearchStationByPathErrorCode | ClientRequestFailureCode;

export type SearchStationByPathState =
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
          stations: null;
          failure: RequestFailure;
          policy: SearchStationByPathFailurePolicy;
      };

const INITIAL_STATIONS_SEARCH_STATE: SearchStationByPathState = {
    status: "idle",
    stations: null,
    failure: null,
    policy: null,
};

export function useSearchStationByPath() {
    const [state, setState] = useState<SearchStationByPathState>(INITIAL_STATIONS_SEARCH_STATE);
    const failedSearchInputRef = useRef<SearchStationByPathInput | null>(null);
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
            const stations = await searchStationByPath({
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
            const policy = decideSearchStationByPathFailurePolicy(requestFailure.code);
            failedSearchInputRef.current = {
                paths: allPaths,
                radiusKm,
            };
            setState({
                status: "error",
                stations: null,
                failure: requestFailure,
                policy,
            });
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

    const reset = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        failedSearchInputRef.current = null;
        setState(INITIAL_STATIONS_SEARCH_STATE);
    }, []);

    return { state, retry, reset, search };
}

function decideSearchStationByPathFailurePolicy(code: string): SearchStationByPathFailurePolicy {
    switch (code as SearchStationByPathFailureCode) {
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
