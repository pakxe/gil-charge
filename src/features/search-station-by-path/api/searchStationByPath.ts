import { z } from "zod";

import { createRequestFailure } from "@/shared/lib/requestFailure";
import { PathSet } from "@/shared/types/map";

import { httpClient } from "@/shared/api/httpClient";
import { baseStationSchema } from "@/shared/api/stationSchemas";
import { toApiRequestFailure } from "@/shared/api/toApiRequestFailure";
import { createApiErrorSchema } from "@/shared/api/createApiErrorSchema";

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

const searchStationByPathErrorSchema = createApiErrorSchema(SEARCH_STATION_BY_PATH_ERROR_CODES);

const pathStationSchema = baseStationSchema.extend({
    price: z.number(),
    brandCode: z
        .string()
        .nullish()
        .transform((brandCode) => brandCode ?? null),
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
    const response = await postSearchStationByPath({
        paths,
        radiusKm,
        signal,
    });

    const parsed = searchStationByPathResponseSchema.safeParse(response.data);

    if (!parsed.success) {
        throw createRequestFailure("INVALID_RESPONSE", { cause: parsed.error });
    }

    return parsed.data.stations;
}

async function postSearchStationByPath({ paths, radiusKm, signal }: SearchStationByPathParams) {
    try {
        return await httpClient.post<unknown>(
            "/stations/path",
            {
                paths,
                radiusKm,
            },
            {
                signal,
            },
        );
    } catch (error) {
        throw toApiRequestFailure(error, searchStationByPathErrorSchema);
    }
}
