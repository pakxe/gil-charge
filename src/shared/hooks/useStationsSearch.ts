import { useState } from "react";
import axios from "axios";
import { PathSet, Station } from "@/shared/types/map";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "") + "/api";

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
            onSuccess(response.data.stations);
        } catch (error) {
            console.error("주유소 검색 실패:", error);
            alert("주유소를 찾는 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return { fetchStations, isLoading };
}
