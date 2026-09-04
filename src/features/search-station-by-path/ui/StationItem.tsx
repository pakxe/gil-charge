import type { Station } from "@/shared/model/map";
import { cn } from "@/shared/lib/cn";
import { BRAND_BY_CODE } from "@/features/search-station-by-path/ui/stationBrand";

type LocalCurrencyStatus = Station["localCurrency"]["status"];

type StationItemProps = {
    station: Station;
    isSelected: boolean;
    buttonRef?: (element: HTMLButtonElement | null) => void;
    onClick: (stationId: string) => void;
};

export function StationItem({ station, isSelected, buttonRef, onClick }: StationItemProps) {
    const currencyStatus = station.localCurrency?.status ?? "UNKNOWN";
    const brand = station.brandCode ? BRAND_BY_CODE[station.brandCode] : undefined;

    const shouldShowCurrencyStatusTag = currencyStatus === "ACCEPTED" || currencyStatus === "NOT_ACCEPTED";

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

            <div className="mt-3 flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sub font-medium text-gil-gray-600">
                    {station.localCurrency?.roadAddress ?? "주소 정보 없음"}
                </p>

                <div className="flex shrink-0 items-center gap-1.5">
                    {brand && <span className={cn("rounded-full px-2 py-0.5 text-xs", brand.tone)}>{brand.label}</span>}

                    {shouldShowCurrencyStatusTag && (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs", getStatusTone(currencyStatus))}>
                            {LOCAL_CURRENCY_STATUS_LABELS[currencyStatus]}
                        </span>
                    )}
                </div>
            </div>

            {station.localCurrency?.currencyName && (
                <div className="mt-3 flex items-center justify-end">
                    <span className="min-w-0 truncate text-tiny font-bold text-gil-gray-600">
                        {station.localCurrency.currencyName}
                    </span>
                </div>
            )}
        </button>
    );
}

const LOCAL_CURRENCY_STATUS_LABELS: Record<LocalCurrencyStatus, string> = {
    ACCEPTED: "지역화폐 가능",
    NOT_ACCEPTED: "지역화폐 불가능",
    UNKNOWN: "확인 필요",
    OUT_OF_SCOPE: "확인 대상 아님",
    MISSING_ROAD_ADDRESS: "주소 확인 불가",
    ERROR: "확인 실패",
};

function getStatusTone(status: LocalCurrencyStatus) {
    switch (status) {
        case "ACCEPTED":
            return "bg-gil-green-400/20 text-gil-green-400";

        case "NOT_ACCEPTED":
            return "bg-gil-gray-800 text-gil-gray-200";

        case "ERROR":
            return "bg-gil-brown-600/30 text-gil-yellow-400";

        case "UNKNOWN":
        case "OUT_OF_SCOPE":
        case "MISSING_ROAD_ADDRESS":
            return "bg-gil-gray-800 text-gil-gray-600";
    }
}
