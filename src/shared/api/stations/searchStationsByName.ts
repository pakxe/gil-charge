import { z } from "zod";

import { createRequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";
import { isHttpFailure } from "../httpFailure";
import { httpClient } from "../httpClient";
import { baseStationSchema } from "./stationSchemas";

export const SEARCH_STATIONS_BY_NAME_ERROR_CODES = [
    "INVALID_INPUT",
    "PAYLOAD_TOO_LARGE",
    "ROUTE_NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "OPINET_UNAVAILABLE",
    "DATABASE_UNAVAILABLE",
    "CONFIGURATION_ERROR",
    "INTERNAL_SERVER_ERROR",
] as const;

export type SearchStationsByNameErrorCode = (typeof SEARCH_STATIONS_BY_NAME_ERROR_CODES)[number];

type SearchStationsByNameErrorResponse = {
    code: SearchStationsByNameErrorCode;
    message: string;
};

const SEARCH_STATIONS_BY_NAME_ERROR_CODE_SET = new Set<string>(SEARCH_STATIONS_BY_NAME_ERROR_CODES);

const stationNameSearchResultSchema = baseStationSchema.extend({
    brand: z.string().nullable(),
    chargingStationBrand: z.string().nullable(),
    lotAddress: z.string().nullable(),
    roadAddress: z.string().nullable(),
    sigunCode: z.string().nullable(),
    lpgYn: z.string().nullable(),
    gis: z.object({
        x: z.number(),
        y: z.number(),
        coordinateSystem: z.literal("KATEC"),
    }),
});

export type StationNameSearchResult = z.infer<typeof stationNameSearchResultSchema>;

const stationsNameResponseSchema = z.object({
    stations: z.array(stationNameSearchResultSchema),
});

export type SearchStationsByNameParams = {
    osnm: string;
    area?: string;
    signal?: AbortSignal;
};

export async function searchStationsByName({ osnm, area, signal }: SearchStationsByNameParams) {
    const response = await getStationsName({ osnm, area, signal });

    const parsed = stationsNameResponseSchema.safeParse(response.data);

    if (!parsed.success) {
        throw createRequestFailure("INVALID_RESPONSE");
    }

    return parsed.data.stations;
}

async function getStationsName({ osnm, area, signal }: SearchStationsByNameParams) {
    try {
        return await httpClient.get<unknown>("/stations/name", {
            params: {
                osnm,
                ...(area ? { area } : {}),
            },
            signal,
        });
    } catch (error) {
        throw toSearchStationsByNameFailure(error);
    }
}

function isErrorResponse(value: unknown): value is SearchStationsByNameErrorResponse {
    if (!isRecord(value)) {
        return false;
    }

    return isErrorCode(value.code) && typeof value.message === "string";
}

function isErrorCode(value: unknown): value is SearchStationsByNameErrorCode {
    return typeof value === "string" && SEARCH_STATIONS_BY_NAME_ERROR_CODE_SET.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSearchStationsByNameFailure(error: unknown) {
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
