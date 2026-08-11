import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { LatLng } from "@/shared/model/map";
import { useMap } from "@/shared/model/useMap";
import { MAP_Z_INDEX } from "@/shared/constants/map";
import { Map } from "@/shared/ui/Map/Map";
import { cn } from "@/shared/utils/cn";

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

type TwoPointerGestureState = {
    previousCenter: Point;
    startDistance: number;
    startZoomLevel: number;
};

type PanDragState = {
    pointerId: number;
    lastPoint: Point;
};

export function WaypointLassoLayer({ enabled, onComplete }: Props) {
    const map = useMap();
    const dragStateRef = useRef<DragState | null>(null);
    const panDragStateRef = useRef<PanDragState | null>(null);
    const activePointersRef = useRef<globalThis.Map<number, Point>>(new globalThis.Map());
    const gestureStateRef = useRef<TwoPointerGestureState | null>(null);
    const pathRef = useRef<LatLng[]>([]);
    const cleanupListenersRef = useRef<(() => void) | null>(null);
    const [draftPath, setDraftPath] = useState<LatLng[]>([]);

    useEffect(() => {
        const activePointers = activePointersRef.current;

        return () => {
            cleanupListenersRef.current?.();
            cleanupListenersRef.current = null;
            dragStateRef.current = null;
            panDragStateRef.current = null;
            activePointers.clear();
            gestureStateRef.current = null;
            pathRef.current = [];
        };
    }, []);

    const beginTwoPointerGesture = (currentMap: NonNullable<typeof map>) => {
        const snapshot = getTwoPointerSnapshot(Array.from(activePointersRef.current.values()));
        if (!snapshot) return;

        gestureStateRef.current = {
            previousCenter: snapshot.center,
            startDistance: snapshot.distance,
            startZoomLevel: currentMap.getLevel(),
        };
        dragStateRef.current = null;
        pathRef.current = [];
        setDraftPath([]);
    };

    const updateTwoPointerGesture = (currentMap: NonNullable<typeof map>) => {
        const snapshot = getTwoPointerSnapshot(Array.from(activePointersRef.current.values()));
        if (!snapshot) return;

        const previousGesture = gestureStateRef.current ?? {
            previousCenter: snapshot.center,
            startDistance: snapshot.distance,
            startZoomLevel: currentMap.getLevel(),
        };
        const deltaX = snapshot.center.x - previousGesture.previousCenter.x;
        const deltaY = snapshot.center.y - previousGesture.previousCenter.y;

        if (deltaX !== 0 || deltaY !== 0) {
            currentMap.panBy(-deltaX, -deltaY);
        }

        const zoomRatio = snapshot.distance / previousGesture.startDistance;
        const nextZoomLevel = Math.round(previousGesture.startZoomLevel - Math.log2(zoomRatio));

        if (Number.isFinite(nextZoomLevel) && nextZoomLevel !== currentMap.getLevel()) {
            currentMap.setZoom(nextZoomLevel);
        }

        gestureStateRef.current = {
            ...previousGesture,
            previousCenter: snapshot.center,
        };
        dragStateRef.current = null;
        pathRef.current = [];
        setDraftPath([]);
    };

    const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
        if (!enabled || !map || (event.deltaX === 0 && event.deltaY === 0)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
            const deltaX = event.deltaX !== 0 ? event.deltaX : event.deltaY;

            map.panBy(deltaX, 0);
            return;
        }

        const nextZoomLevel = map.getLevel() + Math.sign(event.deltaY);
        map.setZoom(nextZoomLevel);
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!enabled || !map) {
            return;
        }

        if (event.button === 1 || event.button === 2) {
            beginMousePan(event, map);
            return;
        }

        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        activePointersRef.current.set(event.pointerId, toPoint(event));

        if (activePointersRef.current.size >= 2) {
            beginTwoPointerGesture(map);
            return;
        }

        if (cleanupListenersRef.current) {
            return;
        }

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

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!activePointersRef.current.has(moveEvent.pointerId)) {
                return;
            }

            moveEvent.preventDefault();
            activePointersRef.current.set(moveEvent.pointerId, toPoint(moveEvent));

            if (activePointersRef.current.size >= 2 || gestureStateRef.current) {
                updateTwoPointerGesture(map);
                return;
            }

            const dragState = dragStateRef.current;

            if (!dragState || dragState.pointerId !== moveEvent.pointerId) {
                return;
            }

            const currentPoint = toPoint(moveEvent);
            const distanceFromStart = getDistance(dragState.startPoint, currentPoint);

            if (!dragState.isDrawing && distanceFromStart <= MOVE_BEGIN_THRESHOLD_PX) {
                return;
            }

            const currentLatLng = map.clientPointToLatLng(moveEvent.clientX, moveEvent.clientY);

            if (!dragState.isDrawing) {
                dragState.isDrawing = true;
                pathRef.current = [dragState.startLatLng, currentLatLng];
                dragState.lastSamplePoint = currentPoint;
                setDraftPath(pathRef.current);
                return;
            }

            if (getDistance(dragState.lastSamplePoint, currentPoint) < PATH_SAMPLE_INTERVAL_PX) {
                return;
            }

            pathRef.current = [...pathRef.current, currentLatLng];
            dragState.lastSamplePoint = currentPoint;
            setDraftPath(pathRef.current);
        };

        const handlePointerUpOrCancel = (endEvent: PointerEvent) => {
            const dragState = dragStateRef.current;
            const wasTwoPointerGesture = gestureStateRef.current !== null;

            activePointersRef.current.delete(endEvent.pointerId);

            if (wasTwoPointerGesture || activePointersRef.current.size > 0) {
                dragStateRef.current = null;
                gestureStateRef.current = activePointersRef.current.size >= 2 ? gestureStateRef.current : null;
                pathRef.current = [];
                setDraftPath([]);

                if (activePointersRef.current.size === 0) {
                    cleanupListenersRef.current?.();
                    cleanupListenersRef.current = null;
                }

                return;
            }

            cleanupListenersRef.current?.();
            cleanupListenersRef.current = null;
            dragStateRef.current = null;
            setDraftPath([]);

            if (!dragState || dragState.pointerId !== endEvent.pointerId || !dragState.isDrawing) {
                pathRef.current = [];
                return;
            }

            if (endEvent.type === "pointerup") {
                const completedPath = appendEndPoint(pathRef.current, dragState.lastSamplePoint, endEvent, map);

                if (completedPath.length >= 3) {
                    onComplete(completedPath);
                }
            }

            pathRef.current = [];
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUpOrCancel);
        window.addEventListener("pointercancel", handlePointerUpOrCancel);
        cleanupListenersRef.current = () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUpOrCancel);
            window.removeEventListener("pointercancel", handlePointerUpOrCancel);
        };
    };

    const beginMousePan = (event: ReactPointerEvent<HTMLDivElement>, currentMap: NonNullable<typeof map>) => {
        event.preventDefault();
        event.stopPropagation();
        cleanupListenersRef.current?.();

        activePointersRef.current.clear();
        activePointersRef.current.set(event.pointerId, toPoint(event));
        dragStateRef.current = null;
        gestureStateRef.current = null;
        pathRef.current = [];
        setDraftPath([]);
        panDragStateRef.current = {
            pointerId: event.pointerId,
            lastPoint: toPoint(event),
        };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const panDragState = panDragStateRef.current;

            if (!panDragState || panDragState.pointerId !== moveEvent.pointerId) {
                return;
            }

            moveEvent.preventDefault();

            const currentPoint = toPoint(moveEvent);
            const deltaX = currentPoint.x - panDragState.lastPoint.x;
            const deltaY = currentPoint.y - panDragState.lastPoint.y;

            if (deltaX !== 0 || deltaY !== 0) {
                currentMap.panBy(-deltaX, -deltaY);
            }

            panDragStateRef.current = {
                ...panDragState,
                lastPoint: currentPoint,
            };
        };

        const handlePointerUpOrCancel = (endEvent: PointerEvent) => {
            const panDragState = panDragStateRef.current;

            if (!panDragState || panDragState.pointerId !== endEvent.pointerId) {
                return;
            }

            cleanupListenersRef.current?.();
            cleanupListenersRef.current = null;
            panDragStateRef.current = null;
            activePointersRef.current.clear();
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUpOrCancel);
        window.addEventListener("pointercancel", handlePointerUpOrCancel);
        cleanupListenersRef.current = () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUpOrCancel);
            window.removeEventListener("pointercancel", handlePointerUpOrCancel);
        };
    };

    const visibleDraftPath = enabled ? draftPath : [];

    return (
        <>
            {visibleDraftPath.length >= 3 && (
                <Map.Polygon
                    path={visibleDraftPath}
                    strokeWeight={2}
                    strokeColor="#f0c243"
                    strokeOpacity={0.8}
                    strokeStyle="solid"
                    fillColor="#f0c243"
                    fillOpacity={0.16}
                    zIndex={MAP_Z_INDEX.lasso}
                />
            )}
            {visibleDraftPath.length >= 2 && (
                <Map.Polyline
                    path={visibleDraftPath}
                    strokeWeight={3}
                    strokeColor="#f0c243"
                    strokeOpacity={1}
                    strokeStyle="solid"
                    zIndex={MAP_Z_INDEX.lasso + 1}
                />
            )}
            <div
                aria-hidden="true"
                className={cn("absolute inset-0 z-40 touch-none", enabled ? "cursor-crosshair" : "pointer-events-none")}
                onContextMenu={(event) => {
                    if (!enabled) return;

                    event.preventDefault();
                    event.stopPropagation();
                }}
                onAuxClick={(event) => {
                    if (!enabled) return;

                    event.preventDefault();
                    event.stopPropagation();
                }}
                onPointerDown={handlePointerDown}
                onWheel={handleWheel}
            />
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

type TwoPointerSnapshot = {
    center: Point;
    distance: number;
};

function getTwoPointerSnapshot(points: Point[]): TwoPointerSnapshot | null {
    const first = points[0];
    const second = points[1];

    if (!first || !second) {
        return null;
    }

    return {
        center: {
            x: (first.x + second.x) / 2,
            y: (first.y + second.y) / 2,
        },
        distance: Math.max(getDistance(first, second), 1),
    };
}

function toPoint(event: Pick<PointerEvent | ReactPointerEvent<HTMLDivElement>, "clientX" | "clientY">): Point {
    return {
        x: event.clientX,
        y: event.clientY,
    };
}

function getDistance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
