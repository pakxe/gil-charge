import { z } from "zod";

import { createRequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";
import { PathSet } from "@/shared/types/map";
import { isHttpFailure } from "@/shared/api/httpFailure";
import { httpClient } from "@/shared/api/httpClient";
import { baseStationSchema } from "@/shared/api/stationSchemas";

export const SEARCH_STATION_BY_PATH_ERROR_CODES = [
    "INVALID_INPUT",
    "PAYLOAD_TOO_LARGE",
    "ROUTE_NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "OPINET_UNAVAILABLE",
    "DATABASE_UNAVAILABLE",
    "CONFIGURATION_ERROR",
    "INTERNAL_SERVER_ERROR",
] as const;

export type SearchStationByPathErrorCode = (typeof SEARCH_STATION_BY_PATH_ERROR_CODES)[number];

type SearchStationByPathErrorResponse = {
    code: SearchStationByPathErrorCode;
    message: string;
};

const SEARCH_STATION_BY_PATH_ERROR_CODE_SET = new Set<string>(SEARCH_STATION_BY_PATH_ERROR_CODES);

const pathStationSchema = baseStationSchema.extend({
    price: z.number(),
    localCurrency: z.object({
        accepted: z.boolean().nullable(),
        status: z.enum(["UNKNOWN", "ACCEPTED", "NOT_ACCEPTED", "OUT_OF_SCOPE", "MISSING_ROAD_ADDRESS", "ERROR"]),
        roadAddress: z.string().nullish(),
        storeName: z.string().nullish(),
        currencyName: z.string().nullish(),
        industryCode: z.string().nullish(),
    }),
});

export type PathStation = z.infer<typeof pathStationSchema>;
export type Station = PathStation;

const searchStationByPathResponseSchema = z.object({
    stations: z.array(pathStationSchema),
});

export type SearchStationByPathParams = {
    paths: PathSet[];
    radiusKm: number;
    signal?: AbortSignal;
};

export async function searchStationByPath({ paths, radiusKm, signal }: SearchStationByPathParams) {
    const response = await postSearchStationByPath({ paths, radiusKm, signal });

    const parsed = searchStationByPathResponseSchema.safeParse(response.data);

    if (!parsed.success) {
        throw createRequestFailure("INVALID_RESPONSE");
    }

    return parsed.data.stations;
}

async function postSearchStationByPath({ paths, radiusKm, signal }: SearchStationByPathParams) {
    try {
        return await httpClient.post<unknown>("/stations/path", { paths, radiusKm }, { signal });
    } catch (error) {
        throw toSearchStationByPathFailure(error);
    }
}

function isErrorResponse(value: unknown): value is SearchStationByPathErrorResponse {
    if (!isRecord(value)) {
        return false;
    }

    return isErrorCode(value.code) && typeof value.message === "string";
}

function isErrorCode(value: unknown): value is SearchStationByPathErrorCode {
    return typeof value === "string" && SEARCH_STATION_BY_PATH_ERROR_CODE_SET.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSearchStationByPathFailure(error: unknown) {
    if (!isHttpFailure(error)) {
        return toRequestFailure(error);
    }

    switch (error.reason) {
        case "HTTP_ERROR":
            if (isErrorResponse(error.data)) {
                return createRequestFailure(error.data.code, {
                    message: error.data.message,
                    status: error.status,
                    cause: error,
                });
            }

            return createRequestFailure("INVALID_RESPONSE", {
                status: error.status,
                cause: error,
            });
        case "OFFLINE":
            return createRequestFailure("OFFLINE", { cause: error });
        case "NETWORK_ERROR":
            return createRequestFailure("NETWORK_ERROR", { cause: error });
        case "TIMEOUT":
            return createRequestFailure("TIMEOUT", { cause: error });
        case "REQUEST_CANCELED":
            return createRequestFailure("REQUEST_CANCELED", { cause: error });
        case "UNKNOWN_ERROR":
            return createRequestFailure("UNKNOWN_ERROR", { cause: error });
    }
}
