import { z } from "zod";

import { createRequestFailure } from "@/shared/lib/requestFailure";

import { httpClient } from "@/shared/api/httpClient";
import { baseStationSchema } from "@/shared/api/stationSchemas";
import { toApiRequestFailure } from "@/shared/api/toApiRequestFailure";
import { createApiErrorSchema } from "@/shared/api/createApiErrorSchema";

export const SEARCH_STATION_BY_NAME_ERROR_CODES = [
    "INVALID_INPUT",
    "PAYLOAD_TOO_LARGE",
    "ROUTE_NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "OPINET_UNAVAILABLE",
    "DATABASE_UNAVAILABLE",
    "CONFIGURATION_ERROR",
    "INTERNAL_SERVER_ERROR",
] as const;

export type SearchStationByNameErrorCode = (typeof SEARCH_STATION_BY_NAME_ERROR_CODES)[number];

const searchStationByNameErrorSchema = createApiErrorSchema(SEARCH_STATION_BY_NAME_ERROR_CODES);

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

export type SearchStationByNameResult = z.infer<typeof stationNameSearchResultSchema>;

const searchStationByNameResponseSchema = z.object({
    stations: z.array(stationNameSearchResultSchema),
});

export type SearchStationByNameParams = {
    osnm: string;
    area?: string;
    signal?: AbortSignal;
};

export async function searchStationByName({ osnm, area, signal }: SearchStationByNameParams) {
    const response = await getSearchStationByName({
        osnm,
        area,
        signal,
    });

    const parsed = searchStationByNameResponseSchema.safeParse(response.data);

    if (!parsed.success) {
        throw createRequestFailure("INVALID_RESPONSE");
    }

    return parsed.data.stations;
}

async function getSearchStationByName({ osnm, area, signal }: SearchStationByNameParams) {
    try {
        return await httpClient.get<unknown>("/stations/name", {
            params: {
                osnm,
                ...(area ? { area } : {}),
            },
            signal,
        });
    } catch (error) {
        throw toApiRequestFailure(error, searchStationByNameErrorSchema);
    }
}
