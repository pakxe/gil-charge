import { useEffect, useRef, useState } from "react";
import type { Dispatch, PointerEvent, SetStateAction } from "react";

import type { Station } from "@/shared/types/map";
import { cn } from "@/shared/utils/cn";

interface ConfirmStepProps {
    stations: Station[];
    visibleHeight: number;
    onVisibleHeightChange: Dispatch<SetStateAction<number>>;
}

export function ConfirmStep({ stations, visibleHeight, onVisibleHeightChange }: ConfirmStepProps) {
    const sheetRef = useRef<HTMLElement | null>(null);
    const dragRef = useRef<{ startY: number; startVisibleHeight: number } | null>(null);

    const [localCurrencyOnly, setLocalCurrencyOnly] = useState(false);
    const [sheetHeight, setSheetHeight] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const sheet = sheetRef.current;
        if (!sheet) return;

        const updateHeight = () => {
            const nextHeight = sheet.getBoundingClientRect().height;

            setSheetHeight(nextHeight);
            onVisibleHeightChange((prev) => Math.min(prev, nextHeight));
        };

        updateHeight();
        window.addEventListener("resize", updateHeight);

        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHeight);
        observer?.observe(sheet);

        return () => {
            window.removeEventListener("resize", updateHeight);
            observer?.disconnect();
        };
    }, [onVisibleHeightChange]);

    const handleSheetPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (sheetHeight === 0) return;

        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            startY: event.clientY,
            startVisibleHeight: visibleHeight,
        };
        setIsDragging(true);
    };

    const handleSheetPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag) return;

        event.preventDefault();
        onVisibleHeightChange(clamp(drag.startVisibleHeight - (event.clientY - drag.startY), 0, sheetHeight));
    };

    const handleSheetPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        dragRef.current = null;
        setIsDragging(false);
        onVisibleHeightChange((prev) => (prev < FULLY_HIDDEN_SNAP_PX ? 0 : prev));
    };

    const clampedVisibleHeight = clamp(visibleHeight, 0, sheetHeight);
    const filteredStations = localCurrencyOnly
        ? stations.filter((station) => station.localCurrency?.accepted === true)
        : stations;
    const visibleStations = [...filteredStations].sort((a, b) => a.price - b.price);

    return (
        <section
            ref={sheetRef}
            className={cn(
                "absolute inset-x-0 bottom-0 z-50 flex h-1/2 flex-col rounded-t-[28px] bg-black px-5 pb-6 pt-3 shadow-2xl",
                !isDragging && "transition-transform duration-150 ease-out",
            )}
            style={{ transform: `translateY(${Math.max(sheetHeight - clampedVisibleHeight, 0)}px)` }}
        >
            <div
                role="slider"
                aria-label="검색 결과 바텀시트 높이 조절"
                aria-valuemin={0}
                aria-valuemax={Math.round(sheetHeight)}
                aria-valuenow={Math.round(clampedVisibleHeight)}
                tabIndex={0}
                className="mx-auto mb-5 flex h-5 w-20 touch-none cursor-grab items-start justify-center active:cursor-grabbing"
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
        </section>
    );
}

const FULLY_HIDDEN_SNAP_PX = 100;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
