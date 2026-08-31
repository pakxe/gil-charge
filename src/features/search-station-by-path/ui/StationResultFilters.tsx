import { BRAND_BY_CODE } from "@/features/search-station-by-path/ui/stationBrand";
import { cn } from "@/shared/lib/cn";

type StationResultFiltersProps = {
    localCurrencyOnly: boolean;
    brandCodes: string[];
    selectedBrandCodes: string[];
    onLocalCurrencyOnlyChange: (enabled: boolean) => void;
    onBrandFilterToggle: (brandCode: string) => void;
};

export function StationResultFilters({
    localCurrencyOnly,
    brandCodes,
    selectedBrandCodes,
    onLocalCurrencyOnlyChange,
    onBrandFilterToggle,
}: StationResultFiltersProps) {
    return (
        <div className="flex min-w-0 flex-col items-end gap-2">
            <div className="flex flex-none items-center justify-end gap-3">
                <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sub font-medium text-gil-gray-200">지역화폐 가능</span>

                    <button
                        type="button"
                        onClick={() => onLocalCurrencyOnlyChange(!localCurrencyOnly)}
                        aria-pressed={localCurrencyOnly}
                        className={cn(
                            "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                            localCurrencyOnly ? "bg-gil-yellow-400" : "bg-gil-gray-700",
                        )}
                    >
                        <span
                            className={cn(
                                "absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
                                localCurrencyOnly ? "translate-x-6" : "translate-x-1",
                            )}
                        />
                    </button>
                </div>
            </div>

            {brandCodes.length > 0 && (
                <div className="flex max-w-full flex-none gap-2 overflow-x-auto pb-1 pt-1">
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
            )}
        </div>
    );
}
