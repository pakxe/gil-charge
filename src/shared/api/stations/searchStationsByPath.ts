import { z } from "zod";

import { createRequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";
import { PathSet } from "@/shared/types/map";
import { isHttpFailure } from "../httpFailure";
import { httpClient } from "../httpClient";
import { baseStationSchema } from "./stationSchemas";

export const SEARCH_STATIONS_BY_PATH_ERROR_CODES = [
    "INVALID_INPUT",
    "PAYLOAD_TOO_LARGE",
    "ROUTE_NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "OPINET_UNAVAILABLE",
    "DATABASE_UNAVAILABLE",
    "CONFIGURATION_ERROR",
    "INTERNAL_SERVER_ERROR",
] as const;

export type SearchStationsByPathErrorCode = (typeof SEARCH_STATIONS_BY_PATH_ERROR_CODES)[number];

type SearchStationsByPathErrorResponse = {
    code: SearchStationsByPathErrorCode;
    message: string;
};

const SEARCH_STATIONS_BY_PATH_ERROR_CODE_SET = new Set<string>(SEARCH_STATIONS_BY_PATH_ERROR_CODES);

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

const stationsPathResponseSchema = z.object({
    stations: z.array(pathStationSchema),
});

export type SearchStationsByPathParams = {
    paths: PathSet[];
    radiusKm: number;
    signal?: AbortSignal;
};

export async function searchStationsByPath({ paths, radiusKm, signal }: SearchStationsByPathParams) {
    const response = await postStationsPath({ paths, radiusKm, signal });

    const parsed = stationsPathResponseSchema.safeParse(response.data);

    if (!parsed.success) {
        throw createRequestFailure("INVALID_RESPONSE");
    }

    return parsed.data.stations;
}

async function postStationsPath({ paths, radiusKm, signal }: SearchStationsByPathParams) {
    try {
        return await httpClient.post<unknown>("/stations/path", { paths, radiusKm }, { signal });
    } catch (error) {
        throw toSearchStationsByPathFailure(error);
    }
}

function isErrorResponse(value: unknown): value is SearchStationsByPathErrorResponse {
    if (!isRecord(value)) {
        return false;
    }

    return isErrorCode(value.code) && typeof value.message === "string";
}

function isErrorCode(value: unknown): value is SearchStationsByPathErrorCode {
    return typeof value === "string" && SEARCH_STATIONS_BY_PATH_ERROR_CODE_SET.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSearchStationsByPathFailure(error: unknown) {
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
