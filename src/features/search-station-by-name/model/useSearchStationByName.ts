import { useCallback, useEffect, useRef, useState } from "react";

import {
    searchStationByName,
    type SearchStationByNameErrorCode,
    type SearchStationByNameResult,
} from "@/features/search-station-by-name/api/searchStationByName";
import { type ClientRequestFailureCode, type RequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";

export const MIN_STATION_NAME_SEARCH_LENGTH = 2;
export const MAX_STATION_NAME_SEARCH_LENGTH = 30;

type SearchStationByNameRequestInput = {
    osnm: string;
    area?: string;
};

export type SearchStationByNameInlineFailure = {
    message: string;
};

export type SearchStationByNameFailurePolicy = {
    presentation: "inline" | "toast" | "silent";
    recovery: "edit-input" | "manual-retry" | "none";
    report: "none" | "always";
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
          status: "error";
          stations: null;
          failure: RequestFailure;
          policy: SearchStationByNameFailurePolicy;
      };

export type SearchStationByNameInputValidation =
    | {
          isValid: true;
          osnm: string;
          inlineFailure: null;
      }
    | {
          isValid: false;
          osnm: null;
          inlineFailure: SearchStationByNameInlineFailure;
      };

const INITIAL_SEARCH_STATIONS_BY_NAME_STATE: SearchStationByNameState = {
    status: "idle",
    stations: null,
    failure: null,
    policy: null,
};

export function useSearchStationByName() {
    const [state, setState] = useState<SearchStationByNameState>(INITIAL_SEARCH_STATIONS_BY_NAME_STATE);
    const [inlineFailure, setInlineFailure] = useState<SearchStationByNameInlineFailure | null>(null);
    const failedSearchInputRef = useRef<SearchStationByNameRequestInput | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const resetInlineFailure = () => {
        setInlineFailure(null);
    };

    const requestStationsByName = useCallback(async ({ osnm, area }: SearchStationByNameRequestInput) => {
        abortControllerRef.current?.abort();

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        failedSearchInputRef.current = null;
        setInlineFailure(null);
        setState((current) => ({
            status: "loading",
            stations: current.stations,
            failure: null,
            policy: null,
        }));

        try {
            const stations = await searchStationByName({ osnm, area, signal: abortController.signal });

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
            const policy = decideSearchStationByNameFailurePolicy(requestFailure.code);
            failedSearchInputRef.current = { osnm, area };

            if (policy.presentation === "inline") {
                setInlineFailure({
                    message: getSearchStationByNameFailureMessage(requestFailure),
                });
            }

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

    const search = async (stationName: string, area?: string) => {
        failedSearchInputRef.current = null;

        const validation = validateSearchStationByNameInput(stationName);

        if (!validation.isValid) {
            setInlineFailure(validation.inlineFailure);
            return;
        }

        await requestStationsByName({ osnm: validation.osnm, area });
    };

    const retry = useCallback(() => {
        const failedSearchInput = failedSearchInputRef.current;

        if (!failedSearchInput) return;

        void requestStationsByName(failedSearchInput);
    }, [requestStationsByName]);

    return {
        state,
        inlineFailure,
        resetInlineFailure,
        retry,
        search,
    };
}

export function validateSearchStationByNameInput(stationName: string): SearchStationByNameInputValidation {
    const osnm = stationName.trim();
    const length = Array.from(osnm).length;

    if (length < MIN_STATION_NAME_SEARCH_LENGTH) {
        return {
            isValid: false,
            osnm: null,
            inlineFailure: {
                message: "주유소명을 2자 이상 입력해주세요.",
            },
        };
    }

    if (length > MAX_STATION_NAME_SEARCH_LENGTH) {
        return {
            isValid: false,
            osnm: null,
            inlineFailure: {
                message: "주유소명을 30자 이하로 입력해주세요.",
            },
        };
    }

    return {
        isValid: true,
        osnm,
        inlineFailure: null,
    };
}

export function getSearchStationByNameFailureMessage(failure: RequestFailure) {
    switch (failure.code) {
        case "INVALID_INPUT":
        case "PAYLOAD_TOO_LARGE":
            return "입력값을 확인해주세요.";
        case "ROUTE_NOT_FOUND":
        case "METHOD_NOT_ALLOWED":
        case "INVALID_RESPONSE":
            return "요청을 처리할 수 없습니다.";
        case "OPINET_UNAVAILABLE":
        case "DATABASE_UNAVAILABLE":
        case "INTERNAL_SERVER_ERROR":
            return "요청이 실패했습니다.";
        case "OFFLINE":
            return "인터넷 연결을 확인해주세요.";
        case "NETWORK_ERROR":
        case "TIMEOUT":
            return "일시적으로 문제가 발생했습니다.";
        case "CONFIGURATION_ERROR":
        case "UNKNOWN_ERROR":
        default:
            return "예상하지 못한 문제가 발생했습니다.";
    }
}

function decideSearchStationByNameFailurePolicy(code: string): SearchStationByNameFailurePolicy {
    switch (code as SearchStationByNameFailureCode) {
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
