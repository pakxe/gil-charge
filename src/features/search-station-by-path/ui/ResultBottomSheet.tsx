import type { RefObject } from "react";

import type { Station } from "@/shared/types/map";
import type { StationSelectionSource } from "@/features/search-station-by-path/model/resultStations";
import { useResultBottomSheetDrag } from "@/features/search-station-by-path/model/useResultBottomSheetDrag";
import { StationList } from "@/features/search-station-by-path/ui/StationList";
import { BRAND_BY_CODE } from "@/features/search-station-by-path/ui/stationBrand";
import { cn } from "@/shared/lib/cn";

type SearchResultBlockProps = {
    containerRef: RefObject<HTMLElement | null>;
    maxHeight: number;
    stations: Station[];
    totalStationCount: number;
    localCurrencyOnly: boolean;
    brandCodes: string[];
    selectedBrandCodes: string[];
    selectedStationId: string | null;
    selectionSource: StationSelectionSource | null;
    visibleHeight: number;
    onVisibleHeightChange: (visibleHeight: number) => void;
    onLocalCurrencyOnlyChange: (enabled: boolean) => void;
    onBrandFilterToggle: (brandCode: string) => void;
    onStationClick: (stationId: string) => void;
    onClose: () => void;
};

export function ResultBottomSheet({
    containerRef,
    maxHeight,
    stations,
    totalStationCount,
    localCurrencyOnly,
    brandCodes,
    selectedBrandCodes,
    selectedStationId,
    selectionSource,
    visibleHeight,
    onVisibleHeightChange,
    onLocalCurrencyOnlyChange,
    onBrandFilterToggle,
    onStationClick,
    onClose,
}: SearchResultBlockProps) {
    const { isDragging, clampedVisibleHeight, handlePointerDown, handlePointerMove, handlePointerEnd } =
        useResultBottomSheetDrag({
            containerRef,
            maxHeight,
            visibleHeight,
            onVisibleHeightChange,
            onClose,
        });

    return (
        <section
            className={cn(
                "pointer-events-auto absolute bottom-0 left-0 w-full overflow-hidden rounded-t-[28px] bg-gil-gray-950 shadow-2xl",
                !isDragging && "transition-[height] duration-150 ease-out",
            )}
            style={{
                height: clampedVisibleHeight,
                maxHeight,
            }}
        >
            <div className={cn("flex h-full min-h-0 flex-col px-4 pt-3", isDragging && "select-none")}>
                <div
                    role="slider"
                    aria-label="검색 결과 바텀시트 높이 조절"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(maxHeight)}
                    aria-valuenow={Math.round(clampedVisibleHeight)}
                    tabIndex={0}
                    className="mx-auto flex h-7 w-full touch-none cursor-grab items-start justify-center pt-2 active:cursor-grabbing"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                >
                    <span className="h-1 w-12 rounded-full bg-gil-gray-700" />
                </div>

                <div className="mb-4 flex flex-none items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-md font-bold text-white">
                            총 {stations.length}
                            개의 주유소
                        </p>

                        <p className="mt-1 text-sub font-medium text-gil-gray-600">가격 낮은 순</p>
                    </div>

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
                    <div className="-mx-4 mb-3 flex flex-none gap-2 overflow-x-auto px-4 pb-1 pt-1">
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

                <StationList
                    totalStationCount={totalStationCount}
                    stations={stations}
                    selectedStationId={selectedStationId}
                    selectionSource={selectionSource}
                    onStationClick={(stationId) => onStationClick(stationId)}
                />
            </div>
        </section>
    );
}
