import { z } from "zod";

import { createAppError } from "@/shared/lib/appError";
import { PathSet } from "@/shared/types/map";
import { httpClient } from "./httpClient";

const stationSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    lat: z.number(),
    lng: z.number(),
    localCurrency: z.object({
        accepted: z.boolean().nullable(),
        status: z.enum(["UNKNOWN", "ACCEPTED", "NOT_ACCEPTED", "OUT_OF_SCOPE", "MISSING_ROAD_ADDRESS", "ERROR"]),
        roadAddress: z.string().nullish(),
        storeName: z.string().nullish(),
        currencyName: z.string().nullish(),
        industryCode: z.string().nullish(),
    }),
});

export type Station = z.infer<typeof stationSchema>;

const stationsPathResponseSchema = z.object({
    stations: z.array(stationSchema),
});

export type SearchStationsByPathParams = {
    paths: PathSet[];
    radiusKm: number;
    signal?: AbortSignal;
};

export async function searchStationsByPath({ paths, radiusKm, signal }: SearchStationsByPathParams) {
    const response = await httpClient.post<unknown>("/stations/path", { paths, radiusKm }, { signal });

    const parsed = stationsPathResponseSchema.safeParse(response.data);

    if (!parsed.success) {
        throw createAppError("INVALID_RESPONSE");
    }

    return parsed.data.stations;
}
