import { useEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";

import type { StationSelectionSource } from "@/features/select_search_type/model/stationSelection";
import type { Station } from "@/shared/types/map";
import { cn } from "@/shared/utils/cn";
import { clamp, snapResultSheetHeight } from "@/features/select_search_type/model/resultBottomSheet";

interface ResultBottomSheetProps {
    containerRef: RefObject<HTMLElement | null>;
    maxHeight: number;
    stations: Station[];
    visibleStations: Station[];
    localCurrencyOnly: boolean;
    selectedStationId: string | null;
    selectionSource: StationSelectionSource | null;
    selectionRevision: number;
    visibleHeight: number;
    onVisibleHeightChange: (visibleHeight: number) => void;
    onLocalCurrencyOnlyChange: (localCurrencyOnly: boolean) => void;
    onStationClick: (stationId: string) => void;
    onClose: () => void;
}

type LocalCurrencyStatus = Station["localCurrency"]["status"];

export function ResultBottomSheet({
    containerRef,
    maxHeight,
    stations,
    visibleStations,
    localCurrencyOnly,
    selectedStationId,
    selectionSource,
    selectionRevision,
    visibleHeight,
    onVisibleHeightChange,
    onLocalCurrencyOnlyChange,
    onStationClick,
    onClose,
}: ResultBottomSheetProps) {
    const dragRef = useRef<{ pointerOffsetFromSheetTop: number } | null>(null);
    const latestVisibleHeightRef = useRef(visibleHeight);
    const stationItemRefs = useRef(new Map<string, HTMLButtonElement>());

    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        latestVisibleHeightRef.current = visibleHeight;
    }, [visibleHeight]);

    useEffect(() => {
        if (selectionSource !== "map" || selectedStationId === null) return;

        stationItemRefs.current.get(selectedStationId)?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
        });
    }, [selectedStationId, selectionRevision, selectionSource]);

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (maxHeight <= 0) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);

        const nextVisibleHeight = clamp(visibleHeight, 0, maxHeight);
        dragRef.current = {
            pointerOffsetFromSheetTop: getContainerBottom(containerRef.current) - event.clientY - nextVisibleHeight,
        };
        latestVisibleHeightRef.current = nextVisibleHeight;
        setIsDragging(true);
    };

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag) return;

        event.preventDefault();

        const nextVisibleHeight = clamp(
            getContainerBottom(containerRef.current) - event.clientY - drag.pointerOffsetFromSheetTop,
            0,
            maxHeight,
        );

        latestVisibleHeightRef.current = nextVisibleHeight;
        onVisibleHeightChange(nextVisibleHeight);
    };

    const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        dragRef.current = null;
        setIsDragging(false);

        const snappedHeight = snapResultSheetHeight(latestVisibleHeightRef.current, maxHeight);
        latestVisibleHeightRef.current = snappedHeight;
        onVisibleHeightChange(snappedHeight);

        if (snappedHeight === 0) {
            onClose();
        }
    };

    const clampedVisibleHeight = clamp(visibleHeight, 0, maxHeight);

    const emptyMessage =
        stations.length === 0
            ? "검색 결과가 없습니다."
            : "지역화폐 사용 가능한 주유소가 없습니다. 필터를 해제해보세요.";

    return (
        <section
            className={cn(
                "pointer-events-auto absolute bottom-0 left-0 w-full overflow-hidden rounded-t-[28px] bg-gil-gray-950 shadow-2xl",
                !isDragging && "transition-[height] duration-150 ease-out",
            )}
            style={{ height: clampedVisibleHeight, maxHeight }}
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
                        <p className="text-md font-bold text-white">총 {visibleStations.length}개의 주유소</p>
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

                <div className="flex min-h-0 flex-1 touch-pan-y flex-col gap-2.5 overflow-y-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {visibleStations.length === 0 ? (
                        <div className="rounded-lg bg-gil-gray-900 px-4 py-5">
                            <p className="text-content font-medium text-gil-gray-600">{emptyMessage}</p>
                        </div>
                    ) : (
                        visibleStations.map((station) => {
                            const currencyStatus = station.localCurrency?.status ?? "UNKNOWN";
                            const shouldShowCurrencyStatusTag =
                                currencyStatus === "ACCEPTED" || currencyStatus === "NOT_ACCEPTED";
                            const isSelected = station.id === selectedStationId;

                            return (
                                <button
                                    key={station.id}
                                    ref={(element) => {
                                        if (element) {
                                            stationItemRefs.current.set(station.id, element);
                                            return;
                                        }

                                        stationItemRefs.current.delete(station.id);
                                    }}
                                    type="button"
                                    aria-pressed={isSelected}
                                    className={cn(
                                        "block w-full rounded-lg px-4 py-4 text-left transition-colors",
                                        isSelected ? "bg-gil-brown-800" : "bg-gil-gray-900",
                                    )}
                                    onClick={() => onStationClick(station.id)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="min-w-0 truncate text-content font-bold text-gil-gray-200">
                                            {station.name}
                                        </p>
                                        <p className="shrink-0 whitespace-nowrap text-section font-bold text-gil-yellow-400">
                                            {station.price.toLocaleString()}원
                                        </p>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <p className="min-w-0 truncate text-sub font-medium text-gil-gray-600">
                                            {station.localCurrency?.roadAddress ?? "주소 정보 없음"}
                                        </p>
                                        {shouldShowCurrencyStatusTag && (
                                            <span
                                                className={cn(
                                                    "shrink-0 rounded-full px-2 py-0.5 text-xs",
                                                    getStatusTone(currencyStatus),
                                                )}
                                            >
                                                {LOCAL_CURRENCY_STATUS_LABELS[currencyStatus]}
                                            </span>
                                        )}
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
                        })
                    )}
                </div>
            </div>
        </section>
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

function getContainerBottom(container: HTMLElement | null) {
    return container?.getBoundingClientRect().bottom ?? window.innerHeight;
}
