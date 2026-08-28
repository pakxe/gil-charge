import { useEffect, useRef, useState } from "react";

import type { PointerEvent, RefObject } from "react";

import { clamp, snapResultSheetHeight } from "@/features/search-station-by-path/model/resultBottomSheet";

type UseResultBottomSheetDragParams = {
    containerRef: RefObject<HTMLElement | null>;
    maxHeight: number;
    visibleHeight: number;
    onVisibleHeightChange: (visibleHeight: number) => void;
    onClose: () => void;
};

export function useResultBottomSheetDrag({
    containerRef,
    maxHeight,
    visibleHeight,
    onVisibleHeightChange,
    onClose,
}: UseResultBottomSheetDragParams) {
    const dragRef = useRef<{
        pointerOffsetFromSheetTop: number;
    } | null>(null);

    const latestVisibleHeightRef = useRef(visibleHeight);

    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        latestVisibleHeightRef.current = visibleHeight;
    }, [visibleHeight]);

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (maxHeight <= 0) return;

        event.preventDefault();

        event.currentTarget.setPointerCapture(event.pointerId);

        const containerBottom = getContainerBottom(containerRef.current);

        const nextVisibleHeight = clamp(visibleHeight, 0, maxHeight);

        const sheetTop = containerBottom - nextVisibleHeight;

        dragRef.current = {
            pointerOffsetFromSheetTop: event.clientY - sheetTop,
        };

        latestVisibleHeightRef.current = nextVisibleHeight;

        setIsDragging(true);
    };

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (!drag) return;

        event.preventDefault();

        const containerBottom = getContainerBottom(containerRef.current);

        const sheetTop = event.clientY - drag.pointerOffsetFromSheetTop;

        const nextVisibleHeight = clamp(containerBottom - sheetTop, 0, maxHeight);

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

    return {
        isDragging,
        clampedVisibleHeight,
        handlePointerDown,
        handlePointerMove,
        handlePointerEnd,
    };
}

function getContainerBottom(container: HTMLElement | null) {
    return container?.getBoundingClientRect().bottom ?? window.innerHeight;
}
