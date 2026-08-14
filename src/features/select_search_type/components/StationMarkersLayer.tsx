import type { Station } from "@/shared/types/map";
import { Map } from "@/shared/ui/Map/Map";
import { cn } from "@/shared/utils/cn";

type Props = {
    stations: Station[];
    selectedStationId: string | null;
    onStationClick: (stationId: string) => void;
};

const STATION_MARKER_Z_INDEX = {
    default: 32,
    selected: 40,
};

export function StationMarkersLayer({ stations, selectedStationId, onStationClick }: Props) {
    return (
        <>
            {stations.map((station) => {
                const isSelected = station.id === selectedStationId;

                return (
                    <Map.CustomOverlay
                        key={station.id}
                        position={{ lat: station.lat, lng: station.lng }}
                        clickable
                        xAnchor={0.5}
                        yAnchor={isSelected ? 1 : 0.5}
                        zIndex={isSelected ? STATION_MARKER_Z_INDEX.selected : STATION_MARKER_Z_INDEX.default}
                    >
                        <button
                            type="button"
                            aria-label={`${station.name} 선택`}
                            className={cn(
                                "relative flex touch-none select-none items-center justify-center border-[3px] border-white text-gil-gray-950 shadow-lg transition-transform",
                                isSelected
                                    ? "min-h-8 min-w-18 rounded-full bg-gil-yellow-400 px-3 text-sub"
                                    : "h-5 w-5 rounded-full bg-gil-gray-600 p-0",
                            )}
                            onClick={(event) => {
                                event.stopPropagation();
                                onStationClick(station.id);
                            }}
                        >
                            {isSelected && (
                                <>
                                    <span className="text-black font-bold text-body">
                                        {station.price.toLocaleString()}원
                                    </span>
                                    <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[12px] border-x-transparent border-t-white" />
                                    <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-gil-yellow-400" />
                                </>
                            )}
                        </button>
                    </Map.CustomOverlay>
                );
            })}
        </>
    );
}
