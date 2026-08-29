// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useLayoutEffect, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CLOSE_RESULT_SHEET_HEIGHT_PX } from "@/features/search-station-by-path/model/resultBottomSheet";
import { useResultBottomSheetDrag } from "@/features/search-station-by-path/model/useResultBottomSheetDrag";

describe("useResultBottomSheetDrag", () => {
    beforeEach(() => {
        HTMLElement.prototype.setPointerCapture = vi.fn();
        HTMLElement.prototype.releasePointerCapture = vi.fn();
        HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("드래그 중 container bottom과 포인터 offset 기준으로 visible height를 계산한다", () => {
        const onVisibleHeightChange = vi.fn();

        render(
            <ResultBottomSheetDragHarness
                initialVisibleHeight={200}
                maxHeight={600}
                containerBottom={800}
                onVisibleHeightChange={onVisibleHeightChange}
            />,
        );

        const handle = screen.getByTestId("drag-handle");

        fireEvent.pointerDown(handle, { clientY: 650, pointerId: 1 });
        fireEvent.pointerMove(handle, { clientY: 500, pointerId: 1 });

        expect(handle.getAttribute("data-dragging")).toBe("true");
        expect(handle.getAttribute("data-visible-height")).toBe("350");
        expect(onVisibleHeightChange).toHaveBeenLastCalledWith(350);
    });

    it("드래그 높이를 0과 maxHeight 사이로 보정한다", () => {
        const onVisibleHeightChange = vi.fn();

        render(
            <ResultBottomSheetDragHarness
                initialVisibleHeight={200}
                maxHeight={600}
                containerBottom={800}
                onVisibleHeightChange={onVisibleHeightChange}
            />,
        );

        const handle = screen.getByTestId("drag-handle");

        fireEvent.pointerDown(handle, { clientY: 650, pointerId: 1 });
        fireEvent.pointerMove(handle, { clientY: 0, pointerId: 1 });
        expect(onVisibleHeightChange).toHaveBeenLastCalledWith(600);

        fireEvent.pointerMove(handle, { clientY: 900, pointerId: 1 });
        expect(onVisibleHeightChange).toHaveBeenLastCalledWith(0);
    });

    it("pointer up 시 높이를 snap하고 0으로 snap되면 close를 호출한다", () => {
        const onVisibleHeightChange = vi.fn();
        const onClose = vi.fn();

        render(
            <ResultBottomSheetDragHarness
                initialVisibleHeight={200}
                maxHeight={600}
                containerBottom={800}
                onVisibleHeightChange={onVisibleHeightChange}
                onClose={onClose}
            />,
        );

        const handle = screen.getByTestId("drag-handle");

        fireEvent.pointerDown(handle, { clientY: 650, pointerId: 1 });
        fireEvent.pointerMove(handle, { clientY: 800 - CLOSE_RESULT_SHEET_HEIGHT_PX + 51, pointerId: 1 });
        fireEvent.pointerUp(handle, { pointerId: 1 });

        expect(handle.getAttribute("data-dragging")).toBe("false");
        expect(onVisibleHeightChange).toHaveBeenLastCalledWith(0);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("maxHeight가 0 이하이면 드래그를 시작하지 않는다", () => {
        const onVisibleHeightChange = vi.fn();

        render(
            <ResultBottomSheetDragHarness
                initialVisibleHeight={200}
                maxHeight={0}
                containerBottom={800}
                onVisibleHeightChange={onVisibleHeightChange}
            />,
        );

        const handle = screen.getByTestId("drag-handle");

        fireEvent.pointerDown(handle, { clientY: 650, pointerId: 1 });
        fireEvent.pointerMove(handle, { clientY: 500, pointerId: 1 });

        expect(handle.getAttribute("data-dragging")).toBe("false");
        expect(onVisibleHeightChange).not.toHaveBeenCalled();
    });
});

type ResultBottomSheetDragHarnessProps = {
    initialVisibleHeight: number;
    maxHeight: number;
    containerBottom: number;
    onVisibleHeightChange?: (visibleHeight: number) => void;
    onClose?: () => void;
};

function ResultBottomSheetDragHarness({
    initialVisibleHeight,
    maxHeight,
    containerBottom,
    onVisibleHeightChange = () => {},
    onClose = () => {},
}: ResultBottomSheetDragHarnessProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [visibleHeight, setVisibleHeight] = useState(initialVisibleHeight);

    useLayoutEffect(() => {
        if (!containerRef.current) return;

        containerRef.current.getBoundingClientRect = () =>
            ({
                bottom: containerBottom,
                height: containerBottom,
                left: 0,
                right: 0,
                top: 0,
                width: 0,
                x: 0,
                y: 0,
                toJSON: () => {},
            }) satisfies DOMRect;
    }, [containerBottom]);

    const { isDragging, clampedVisibleHeight, handlePointerDown, handlePointerMove, handlePointerEnd } =
        useResultBottomSheetDrag({
            containerRef,
            maxHeight,
            visibleHeight,
            onVisibleHeightChange: (nextVisibleHeight) => {
                setVisibleHeight(nextVisibleHeight);
                onVisibleHeightChange(nextVisibleHeight);
            },
            onClose,
        });

    return (
        <div ref={containerRef}>
            <div
                data-testid="drag-handle"
                data-dragging={String(isDragging)}
                data-visible-height={String(clampedVisibleHeight)}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
            />
        </div>
    );
}
