import {
    searchStationByName,
    type SearchStationByNameErrorCode,
    type SearchStationByNameResult,
} from "@/features/search-station-by-name/api/searchStationByName";
import { type ClientRequestFailureCode, type RequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";
import { useCallback, useEffect, useRef, useState } from "react";

export const MIN_STATION_NAME_SEARCH_LENGTH = 2;
export const MAX_STATION_NAME_SEARCH_LENGTH = 30;

type SearchStationByNameRequestInput = {
    osnm: string;
    area?: string;
};

export type SearchStationByNameFailurePolicy = {
    presentation: "inline" | "toast" | "silent";
    recovery: "edit-input" | "manual-retry" | "none";
    report: "none" | "always";
};

export type SearchStationByNameValidationFailureCode = "TOO_LONG" | "TOO_SHORT";

export type SearchStationByNameFailure =
    | {
          type: "validation";
          code: SearchStationByNameValidationFailureCode;
      }
    | {
          type: "request";
          failure: RequestFailure;
      };

type SearchStationByNameFailureCode = SearchStationByNameErrorCode | ClientRequestFailureCode;

export type SearchStationByNameState =
    | {
          status: "idle";
          stations: null;
          failure: null;
          policy: null;
      }
    | {
          status: "loading";
          stations: SearchStationByNameResult[] | null;
          failure: null;
          policy: null;
      }
    | {
          status: "success";
          stations: SearchStationByNameResult[];
          failure: null;
          policy: null;
      }
    | {
          status: "failure";
          stations: SearchStationByNameResult[] | null;
          failure: SearchStationByNameFailure;
          policy: SearchStationByNameFailurePolicy;
      };

export type SearchStationByNameValidation =
    | {
          isValid: true;
          osnm: string;
      }
    | {
          isValid: false;
          code: SearchStationByNameValidationFailureCode;
      };

const INITIAL_SEARCH_STATION_BY_NAME_STATE: SearchStationByNameState = {
    status: "idle",
    stations: null,
    failure: null,
    policy: null,
};

export function useSearchStationByName() {
    const [state, setState] = useState<SearchStationByNameState>(INITIAL_SEARCH_STATION_BY_NAME_STATE);

    const failedRequestInputRef = useRef<SearchStationByNameRequestInput | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    const requestStationsByName = useCallback(async ({ osnm, area }: SearchStationByNameRequestInput) => {
        abortControllerRef.current?.abort();

        const abortController = new AbortController();

        abortControllerRef.current = abortController;

        failedRequestInputRef.current = null;

        setState((current) => ({
            status: "loading",
            stations: current.stations,
            failure: null,
            policy: null,
        }));

        try {
            const stations = await searchStationByName({
                osnm,
                area,
                signal: abortController.signal,
            });

            if (abortController.signal.aborted) {
                return;
            }

            setState({
                status: "success",
                stations,
                failure: null,
                policy: null,
            });
        } catch (error) {
            if (abortController.signal.aborted) {
                return;
            }

            const requestFailure = toRequestFailure(error);

            const failure: SearchStationByNameFailure = {
                type: "request",
                failure: requestFailure,
            };

            const policy = decideFailurePolicy(failure);

            failedRequestInputRef.current = {
                osnm,
                area,
            };

            setState({
                status: "failure",
                stations: null,
                failure,
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

    const search = useCallback(
        async (stationName: string, area?: string) => {
            failedRequestInputRef.current = null;

            const validation = validateSearchStationByNameInput(stationName);

            if (!validation.isValid) {
                const failure: SearchStationByNameFailure = {
                    type: "validation",
                    code: validation.code,
                };

                setState((current) => ({
                    status: "failure",
                    stations: current.stations,
                    failure,
                    policy: decideFailurePolicy(failure),
                }));

                return;
            }

            await requestStationsByName({
                osnm: validation.osnm,
                area,
            });
        },
        [requestStationsByName],
    );

    const retry = useCallback(() => {
        const failedRequestInput = failedRequestInputRef.current;

        if (!failedRequestInput) {
            return;
        }

        void requestStationsByName(failedRequestInput);
    }, [requestStationsByName]);

    const resetValidationError = useCallback(() => {
        setState((current) => {
            if (current.status !== "failure" || current.failure.type !== "validation") {
                return current;
            }

            if (current.stations !== null) {
                return {
                    status: "success",
                    stations: current.stations,
                    failure: null,
                    policy: null,
                };
            }

            return INITIAL_SEARCH_STATION_BY_NAME_STATE;
        });
    }, []);

    return {
        state,
        retry,
        search,
        resetValidationError,
    };
}

export function validateSearchStationByNameInput(stationName: string): SearchStationByNameValidation {
    const osnm = stationName.trim();
    const length = Array.from(osnm).length;

    if (length < MIN_STATION_NAME_SEARCH_LENGTH) {
        return {
            isValid: false,
            code: "TOO_SHORT",
        };
    }

    if (length > MAX_STATION_NAME_SEARCH_LENGTH) {
        return {
            isValid: false,
            code: "TOO_LONG",
        };
    }

    return {
        isValid: true,
        osnm,
    };
}

function decideFailurePolicy(failure: SearchStationByNameFailure): SearchStationByNameFailurePolicy {
    if (failure.type === "validation") {
        return {
            presentation: "inline",
            recovery: "edit-input",
            report: "none",
        };
    }

    switch (failure.failure.code as SearchStationByNameFailureCode) {
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
