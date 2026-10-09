import { useCallback, useRef, useState } from "react";
import { searchStationByPath, type SearchStationByPathErrorCode } from "@/features/search-station-by-path/api/searchStationByPath";
import { type ClientRequestFailureCode, RequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";
import { PathSet, Station } from "@/shared/model/map";
import { useLatestRequest } from "@/shared/model/useLatestRequest";

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
    const { run, cancel } = useLatestRequest();

    const search = useCallback(async (allPaths: PathSet[], radiusKm: number) => {
        failedSearchInputRef.current = null;
        setState((current) => ({
            status: "loading",
            stations: current.stations,
            failure: null,
            policy: null,
        }));

        await run({
            request: (signal) => searchStationByPath({ paths: allPaths, radiusKm, signal }),
            onSuccess: (stations) => {
                setState({
                    status: "success",
                    stations,
                    failure: null,
                    policy: null,
                });
            },
            onError: (error) => {
                const requestFailure = toRequestFailure(error);
                const policy = decideSearchStationByPathFailurePolicy(requestFailure.code);
                failedSearchInputRef.current = { paths: allPaths, radiusKm };
                setState({
                    status: "error",
                    stations: null,
                    failure: requestFailure,
                    policy,
                });
            },
        });
    }, [run]);

    const retry = useCallback(() => {
        const failedSearchInput = failedSearchInputRef.current;

        if (!failedSearchInput) return;

        void search(failedSearchInput.paths, failedSearchInput.radiusKm);
    }, [search]);

    const reset = useCallback(() => {
        cancel();
        failedSearchInputRef.current = null;
        setState(INITIAL_STATIONS_SEARCH_STATE);
    }, [cancel]);

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
