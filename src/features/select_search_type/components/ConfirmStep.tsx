import { useEffect, useRef, useState } from "react";
import type { Dispatch, PointerEvent, RefObject, SetStateAction } from "react";

import type { Station } from "@/shared/types/map";
import { cn } from "@/shared/utils/cn";

interface ConfirmStepProps {
    containerRef: RefObject<HTMLElement | null>;
    maxHeight: number;
    stations: Station[];
    visibleHeight: number;
    onVisibleHeightChange: Dispatch<SetStateAction<number>>;
    onClose: () => void;
}

export function ConfirmStep({
    containerRef,
    maxHeight,
    stations,
    visibleHeight,
    onVisibleHeightChange,
    onClose,
}: ConfirmStepProps) {
    const dragRef = useRef<{ pointerOffsetFromSheetTop: number } | null>(null);
    const latestVisibleHeightRef = useRef(visibleHeight);

    const [localCurrencyOnly, setLocalCurrencyOnly] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        latestVisibleHeightRef.current = visibleHeight;
    }, [visibleHeight]);

    const handleSheetPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (maxHeight === 0) return;

        const nextVisibleHeight = clamp(visibleHeight, 0, maxHeight);
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            pointerOffsetFromSheetTop: getContainerBottom(containerRef.current) - event.clientY - nextVisibleHeight,
        };
        latestVisibleHeightRef.current = nextVisibleHeight;
        setIsDragging(true);
    };

    const handleSheetPointerMove = (event: PointerEvent<HTMLDivElement>) => {
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

    const handleSheetPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        dragRef.current = null;
        setIsDragging(false);

        if (latestVisibleHeightRef.current < CLOSE_THRESHOLD_PX) {
            latestVisibleHeightRef.current = 0;
            onVisibleHeightChange(0);
            onClose();
            return;
        }

        onVisibleHeightChange(clamp(latestVisibleHeightRef.current, 0, maxHeight));
    };

    const clampedVisibleHeight = clamp(visibleHeight, 0, maxHeight);
    const filteredStations = localCurrencyOnly
        ? stations.filter((station) => station.localCurrency?.accepted === true)
        : stations;
    const visibleStations = [...filteredStations].sort((a, b) => a.price - b.price);

    return (
        <section
            className={cn(
                "pointer-events-auto w-full shrink-0 overflow-hidden rounded-t-[28px] bg-black shadow-2xl",
                !isDragging && "transition-[height] duration-150 ease-out",
            )}
            style={{ height: clampedVisibleHeight, maxHeight }}
        >
            <div className={cn("flex h-full min-h-0 flex-col px-5 pb-6 pt-3", isDragging && "select-none")}>
                <div
                    role="slider"
                    aria-label="검색 결과 바텀시트 높이 조절"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(maxHeight)}
                    aria-valuenow={Math.round(clampedVisibleHeight)}
                    tabIndex={0}
                    className="mx-auto mb-3 flex h-10 w-full touch-none cursor-grab items-start justify-center pt-2 active:cursor-grabbing"
                    onPointerDown={handleSheetPointerDown}
                    onPointerMove={handleSheetPointerMove}
                    onPointerUp={handleSheetPointerEnd}
                    onPointerCancel={handleSheetPointerEnd}
                >
                    <span className="h-1 w-12 rounded-full bg-gil-gray-700" />
                </div>

                <div className="mb-5 flex flex-none items-center justify-between gap-4">
                    <p className="text-content font-bold text-white">총 {visibleStations.length}개의 주유소</p>
                    <div className="flex items-center gap-3">
                        <span className="text-sub font-medium text-gil-gray-200">지역화폐 가능</span>
                        <button
                            type="button"
                            onClick={() => setLocalCurrencyOnly((prev) => !prev)}
                            onPointerDown={(event) => event.stopPropagation()}
                            aria-pressed={localCurrencyOnly}
                            className={`relative z-10 h-7 w-12 shrink-0 rounded-full transition-colors ${
                                localCurrencyOnly ? "bg-gil-yellow-400" : "bg-gil-gray-700"
                            }`}
                        >
                            <span
                                className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                    localCurrencyOnly ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 touch-pan-y flex-col gap-2.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {visibleStations.length === 0 ? (
                        <div className="rounded-2xl bg-gil-gray-900 px-4 py-5">
                            <p className="text-content text-gil-gray-600">
                                조건에 맞는 주유소가 없습니다. 지역화폐 필터를 해제해보세요.
                            </p>
                        </div>
                    ) : (
                        visibleStations.map((station) => (
                            <div key={station.id} className="rounded-2xl bg-gil-gray-900 px-4 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 truncate text-content font-bold text-gil-gray-200">
                                        {station.name}
                                    </p>
                                    <p className="shrink-0 whitespace-nowrap text-section font-bold text-gil-yellow-400">
                                        {station.price.toLocaleString()}원
                                    </p>
                                </div>
                                <p className="mt-3 truncate text-sub font-medium text-gil-gray-600">
                                    {station.localCurrency?.roadAddress ?? "주소 정보 없음"}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

const CLOSE_THRESHOLD_PX = 100;

function getContainerBottom(container: HTMLElement | null) {
    return container?.getBoundingClientRect().bottom ?? window.innerHeight;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
