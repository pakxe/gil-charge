import { useState } from "react";
import axios from "axios";
import { PathSet, Station } from "@/shared/types/map";
import { env } from "@/shared/config/env";
import { createAppError, toAppError } from "@/shared/lib/appError";

const API_BASE_URL = env.NODE_ENV === "production" ? `${env.VITE_API_URL}/api` : "/api";

type StationsPathResponse = {
    stations: Station[];
};

export function useStationsSearch(onSuccess: (stations: Station[]) => void) {
    const [isLoading, setIsLoading] = useState(false);

    const fetchStations = async (allPaths: PathSet[], radiusKm: number) => {
        if (allPaths.length === 0) {
            alert("먼저 지도에 검색할 영역을 그려주세요!");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/stations/path`, { paths: allPaths, radiusKm });
            if (!isStationsPathResponse(response.data)) {
                throw createAppError("INVALID_RESPONSE");
            }

            onSuccess(response.data.stations);
        } catch (error) {
            const appError = toAppError(error);

            if (appError.code === "REQUEST_CANCELED") {
                return;
            }

            console.error("주유소 검색 실패:", appError);
            alert(appError.message);
        } finally {
            setIsLoading(false);
        }
    };

    return { fetchStations, isLoading };
}

function isStationsPathResponse(value: unknown): value is StationsPathResponse {
    return typeof value === "object" && value !== null && "stations" in value && Array.isArray(value.stations);
}
