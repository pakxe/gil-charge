import { BRAND_BY_CODE } from "@/features/search-station-by-path/ui/stationBrand";
import { cn } from "@/shared/lib/cn";

type StationResultFiltersProps = {
    brandCodes: string[];
    selectedBrandCodes: string[];
    onBrandFilterToggle: (brandCode: string) => void;
};

export function StationResultFilters({
    brandCodes,
    selectedBrandCodes,
    onBrandFilterToggle,
}: StationResultFiltersProps) {
    return (
        <div className="-mx-4 mb-3 flex flex-none items-center gap-3 overflow-x-auto px-4 pb-1 pt-1">
            <div className="-mx-1 -my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1">
                {brandCodes.map((brandCode) => {
                    const brand = BRAND_BY_CODE[brandCode] ?? {
                        label: brandCode,
                        tone: "bg-gil-gray-700 text-gil-gray-200",
                    };
                    const isSelected = selectedBrandCodes.includes(brandCode);

                    return (
                        <button
                            key={brandCode}
                            type="button"
                            aria-pressed={isSelected}
                            className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold transition",
                                isSelected
                                    ? `${brand.tone} ring-1 ring-current`
                                    : "bg-gil-gray-800 text-gil-gray-500",
                            )}
                            onClick={() => onBrandFilterToggle(brandCode)}
                        >
                            {brand.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
