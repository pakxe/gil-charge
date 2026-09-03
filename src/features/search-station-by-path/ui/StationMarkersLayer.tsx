import type { Station } from "@/shared/model/map";
import { Map } from "@/shared/ui/Map/Map";
import { cn } from "@/shared/lib/cn";
import { MAP_Z_INDEX } from "@/shared/constants/map";

type Props = {
    stations: Station[];
    selectedStationId: string | null;
    onStationClick: (stationId: string) => void;
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
                        zIndex={isSelected ? MAP_Z_INDEX.stationMarkerDefault : MAP_Z_INDEX.stationMakerSelected}
                    >
                        <button
                            type="button"
                            aria-label={`${station.name} 선택`}
                            className={cn(
                                "relative flex touch-none select-none items-center justify-center border-[3px] border-white text-gil-gray-950 shadow-lg transition-transform",
                                isSelected
                                    ? "min-h-8 min-w-18 rounded-full bg-gil-yellow-400 px-3 text-sub"
                                    : "h-5 w-5 rounded-full bg-gil-gray-500 p-0",
                            )}
                            onClick={(event) => {
                                event.stopPropagation();
                                onStationClick(station.id);
                            }}
                        >
                            {isSelected ? (
                                <>
                                    <span className="text-black font-bold text-body">
                                        {station.price.toLocaleString()}원
                                    </span>
                                    <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-10 border-t-12 border-x-transparent border-t-white" />
                                    <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-gil-yellow-400" />
                                </>
                            ) : (
                                <span aria-hidden="true" className="absolute -inset-2 rounded-full" />
                            )}
                        </button>
                    </Map.CustomOverlay>
                );
            })}
        </>
    );
}
