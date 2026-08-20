import { useState } from "react";
import { searchStationsByPath } from "@/shared/api/stationApi";
import { getDefaultErrorFeedback } from "@/shared/lib/errorFeedback";
import { toAppError } from "@/shared/lib/appError";
import { PathSet, Station } from "@/shared/types/map";
import { useErrorFeedback } from "@/shared/lib/useErrorFeedback";

export function useStationsSearch(onSuccess: (stations: Station[]) => void) {
    const [isLoading, setIsLoading] = useState(false);
    const { handleFeedback } = useErrorFeedback();

    const fetchStations = async (allPaths: PathSet[], radiusKm: number) => {
        if (allPaths.length === 0) {
            handleFeedback({
                type: "toast",
                message: "먼저 지도에 검색할 영역을 그려주세요!",
            });
            return;
        }

        setIsLoading(true);
        try {
            const stations = await searchStationsByPath({ paths: allPaths, radiusKm });
            onSuccess(stations);
        } catch (error) {
            const appError = toAppError(error);
            const feedback = getDefaultErrorFeedback(appError, {
                retry: () => {
                    void fetchStations(allPaths, radiusKm);
                },
            });

            console.error("주유소 검색 실패:", appError);
            handleFeedback(feedback);
        } finally {
            setIsLoading(false);
        }
    };

    return { fetchStations, isLoading };
}
