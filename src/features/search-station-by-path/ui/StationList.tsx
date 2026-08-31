import { useEffect, useRef } from "react";

import type { StationSelectionSource } from "@/features/search-station-by-path/model/resultStations";
import type { Station } from "@/shared/types/map";

import { StationItem } from "@/features/search-station-by-path/ui/StationItem";

type StationListProps = {
    totalStationCount: number;
    stations: Station[];
    selectedStationId: string | null;
    selectionSource: StationSelectionSource | null;
    onStationClick: (stationId: string) => void;
};

export function StationList({
    totalStationCount,
    stations,
    selectedStationId,
    selectionSource,
    onStationClick,
}: StationListProps) {
    const stationItemRefs = useRef(new Map<string, HTMLButtonElement>());

    useEffect(() => {
        if (selectionSource !== "map" || selectedStationId === null) {
            return;
        }

        stationItemRefs.current.get(selectedStationId)?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
        });
    }, [selectedStationId, selectionSource]);

    const emptyMessage =
        totalStationCount === 0
            ? "검색 결과가 없습니다."
            : "지역화폐 사용 가능한 주유소가 없습니다. 필터를 해제해보세요.";

    return (
        <div className="flex min-h-0 flex-1 touch-pan-y flex-col gap-2.5 overflow-y-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {stations.length === 0 ? (
                <div className="rounded-lg bg-gil-gray-900 px-4 py-5">
                    <p className="text-content font-medium text-gil-gray-600">{emptyMessage}</p>
                </div>
            ) : (
                stations.map((station) => (
                    <StationItem
                        key={station.id}
                        station={station}
                        isSelected={station.id === selectedStationId}
                        buttonRef={(element) => {
                            if (element) {
                                stationItemRefs.current.set(station.id, element);

                                return;
                            }

                            stationItemRefs.current.delete(station.id);
                        }}
                        onClick={onStationClick}
                    />
                ))
            )}
        </div>
    );
}
