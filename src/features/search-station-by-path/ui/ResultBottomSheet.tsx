import type { RefObject } from "react";

import type { Station } from "@/shared/types/map";
import type { StationSelectionSource } from "@/features/search-station-by-path/model/resultStations";
import { useResultBottomSheetDrag } from "@/features/search-station-by-path/model/useResultBottomSheetDrag";
import { StationResultFilters } from "@/features/search-station-by-path/ui/StationResultFilters";
import { StationList } from "@/features/search-station-by-path/ui/StationList";
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

                    <StationResultFilters
                        localCurrencyOnly={localCurrencyOnly}
                        brandCodes={brandCodes}
                        selectedBrandCodes={selectedBrandCodes}
                        onLocalCurrencyOnlyChange={onLocalCurrencyOnlyChange}
                        onBrandFilterToggle={onBrandFilterToggle}
                    />
                </div>

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
