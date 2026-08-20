import { useState } from "react";
import { searchStationsByPath } from "@/shared/api/stationApi";
import { toAppError } from "@/shared/lib/appError";
import { PathSet, Station } from "@/shared/types/map";

export function useStationsSearch(onSuccess: (stations: Station[]) => void) {
    const [isLoading, setIsLoading] = useState(false);

    const fetchStations = async (allPaths: PathSet[], radiusKm: number) => {
        if (allPaths.length === 0) {
            alert("먼저 지도에 검색할 영역을 그려주세요!");
            return;
        }

        setIsLoading(true);
        try {
            const stations = await searchStationsByPath({ paths: allPaths, radiusKm });
            onSuccess(stations);
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
