import type { Station } from "@/shared/model/map";
import { cn } from "@/shared/lib/cn";
import { BRAND_BY_CODE } from "@/features/search-station-by-path/ui/stationBrand";

type StationItemProps = {
    station: Station;
    isSelected: boolean;
    buttonRef?: (element: HTMLButtonElement | null) => void;
    onClick: (stationId: string) => void;
};

export function StationItem({ station, isSelected, buttonRef, onClick }: StationItemProps) {
    const brand = station.brandCode ? BRAND_BY_CODE[station.brandCode] : undefined;

    return (
        <button
            ref={buttonRef}
            type="button"
            aria-pressed={isSelected}
            className={cn(
                "block w-full rounded-lg px-4 py-4 text-left transition-colors",
                isSelected ? "bg-gil-brown-800" : "bg-gil-gray-900",
            )}
            onClick={() => onClick(station.id)}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-content font-bold text-gil-gray-200">{station.name}</p>

                <p className="shrink-0 whitespace-nowrap text-section font-bold text-gil-yellow-400">
                    {station.price.toLocaleString()}원
                </p>
            </div>

            {brand && (
                <div className="mt-3 flex justify-end">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs", brand.tone)}>{brand.label}</span>
                </div>
            )}
        </button>
    );
}
