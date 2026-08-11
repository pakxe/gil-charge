import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/shared/model/map";
import { useMap } from "@/shared/model/useMap";
import { MAP_Z_INDEX } from "@/shared/constants/map";
import { Map } from "@/shared/ui/Map/Map";

const MOVE_BEGIN_THRESHOLD_PX = 4;
const PATH_SAMPLE_INTERVAL_PX = 6;

type Props = {
    enabled: boolean;
    onComplete: (path: LatLng[]) => void;
};

type Point = {
    x: number;
    y: number;
};

type DragState = {
    pointerId: number;
    startPoint: Point;
    lastSamplePoint: Point;
    startLatLng: LatLng;
    isDrawing: boolean;
};

export function WaypointLassoLayer({ enabled, onComplete }: Props) {
    const map = useMap();
    const onCompleteRef = useRef(onComplete);
    const dragStateRef = useRef<DragState | null>(null);
    const pathRef = useRef<LatLng[]>([]);
    const [draftPath, setDraftPath] = useState<LatLng[]>([]);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        if (!enabled || !map) return;

        const container = map.getContainer();
        const previousCursor = container.style.cursor;
        const previousTouchAction = container.style.touchAction;

        container.style.cursor = "crosshair";
        container.style.touchAction = "none";

        const handlePointerDown = (event: PointerEvent) => {
            if (event.button !== 0 || shouldIgnoreLassoStart(event.target)) return;

            event.preventDefault();
            event.stopPropagation();

            const startPoint = toPoint(event);
            const startLatLng = map.clientPointToLatLng(event.clientX, event.clientY);

            dragStateRef.current = {
                pointerId: event.pointerId,
                startPoint,
                lastSamplePoint: startPoint,
                startLatLng,
                isDrawing: false,
            };

            pathRef.current = [];
            setDraftPath([]);
        };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const dragState = dragStateRef.current;

            // 드래그 중이 아니거나 다른 포인터 이벤트면 무시
            if (!dragState || dragState.pointerId !== moveEvent.pointerId) return;

            moveEvent.preventDefault();

            const currentPoint = toPoint(moveEvent);
            const distanceFromStart = getDistance(dragState.startPoint, currentPoint);

            if (!dragState.isDrawing && distanceFromStart <= MOVE_BEGIN_THRESHOLD_PX) return;

            const currentLatLng = map.clientPointToLatLng(moveEvent.clientX, moveEvent.clientY);

            if (!dragState.isDrawing) {
                dragState.isDrawing = true;
                pathRef.current = [dragState.startLatLng, currentLatLng];
            } else {
                if (getDistance(dragState.lastSamplePoint, currentPoint) < PATH_SAMPLE_INTERVAL_PX) return;
                pathRef.current = [...pathRef.current, currentLatLng];
            }

            dragState.lastSamplePoint = currentPoint;
            setDraftPath(pathRef.current);
        };

        const handlePointerUpOrCancel = (endEvent: PointerEvent) => {
            const dragState = dragStateRef.current;

            // 현재 진행 중인 드래그 이벤트가 아니면 무시
            if (!dragState || dragState.pointerId !== endEvent.pointerId) return;

            dragStateRef.current = null;
            setDraftPath([]);

            if (dragState.isDrawing && endEvent.type === "pointerup") {
                const completedPath = appendEndPoint(pathRef.current, dragState.lastSamplePoint, endEvent, map);

                if (completedPath.length >= 3) {
                    onCompleteRef.current(completedPath);
                }
            }

            pathRef.current = [];
        };

        container.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUpOrCancel);
        window.addEventListener("pointercancel", handlePointerUpOrCancel);

        return () => {
            container.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUpOrCancel);
            window.removeEventListener("pointercancel", handlePointerUpOrCancel);

            container.style.cursor = previousCursor;
            container.style.touchAction = previousTouchAction;

            dragStateRef.current = null;
            pathRef.current = [];
            setDraftPath([]);
        };
    }, [enabled, map]);

    return (
        <>
            {draftPath.length >= 3 && (
                <Map.Polygon
                    path={draftPath}
                    strokeWeight={2}
                    strokeColor="#f0c243"
                    strokeOpacity={0.8}
                    strokeStyle="solid"
                    fillColor="#f0c243"
                    fillOpacity={0.16}
                    zIndex={MAP_Z_INDEX.lasso}
                />
            )}
        </>
    );
}

function appendEndPoint(
    path: LatLng[],
    lastSamplePoint: Point,
    event: PointerEvent,
    map: NonNullable<ReturnType<typeof useMap>>,
) {
    const endPoint = {
        x: event.clientX,
        y: event.clientY,
    };

    if (getDistance(lastSamplePoint, endPoint) < 1) {
        return path;
    }

    return [...path, map.clientPointToLatLng(event.clientX, event.clientY)];
}

function shouldIgnoreLassoStart(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
        return false;
    }

    return Boolean(target.closest("[data-waypoint-node='true'], button, a, input, select, textarea, [role='button']"));
}

function toPoint(event: Pick<PointerEvent, "clientX" | "clientY">): Point {
    return {
        x: event.clientX,
        y: event.clientY,
    };
}

function getDistance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
