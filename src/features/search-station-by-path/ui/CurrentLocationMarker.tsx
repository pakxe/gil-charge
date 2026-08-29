import { MAP_Z_INDEX } from "@/shared/constants/map";
import { cn } from "@/shared/lib/cn";
import { Map } from "@/shared/ui/Map/Map";

export function CurrentLocationMarker({
    location,
    isStale,
}: {
    location: { lat: number; lng: number };
    isStale: boolean;
}) {
    return (
        <Map.CustomOverlay position={location} xAnchor={0.5} yAnchor={0.5} zIndex={MAP_Z_INDEX.currentLocation}>
            <div
                className={cn(
                    "relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-lg",
                    isStale ? "bg-gil-gray-500" : "bg-blue-500",
                )}
                aria-label={isStale ? "마지막으로 확인된 현재 위치" : "현재 위치"}
                role="img"
            >
                <span
                    className={cn("absolute h-9 w-9 rounded-full", isStale ? "bg-gil-gray-500/20" : "bg-blue-500/20")}
                />
                <span className="relative h-2 w-2 rounded-full bg-white" />
            </div>
        </Map.CustomOverlay>
    );
}
