import { createAppError } from "@/shared/lib/appError";
import { PathSet, Station } from "@/shared/types/map";

import { httpClient } from "./httpClient";

export type SearchStationsByPathParams = {
    paths: PathSet[];
    radiusKm: number;
    signal?: AbortSignal;
};

type StationsPathResponse = {
    stations: Station[];
};

export async function searchStationsByPath({ paths, radiusKm, signal }: SearchStationsByPathParams) {
    const response = await httpClient.post<unknown>("/stations/path", { paths, radiusKm }, { signal });

    if (!isStationsPathResponse(response.data)) {
        throw createAppError("INVALID_RESPONSE");
    }

    return response.data.stations;
}

function isStationsPathResponse(value: unknown): value is StationsPathResponse {
    return typeof value === "object" && value !== null && "stations" in value && Array.isArray(value.stations);
}
