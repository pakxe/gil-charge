import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

type HitArea = {
    position: LatLng;
    width: number;
    height: number;
};

export function WaypointLassoLayer({ enabled, onComplete }: Props) {
    const map = useMap();
    const onCompleteRef = useRef(onComplete);
    const dragStateRef = useRef<DragState | null>(null);
    const pathRef = useRef<LatLng[]>([]);
    const [hitArea, setHitArea] = useState<HitArea | null>(null);
    const [draftPath, setDraftPath] = useState<LatLng[]>([]);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        if (!enabled || !map) return;

        const container = map.getContainer();
        const updateHitArea = () => {
            const rect = container.getBoundingClientRect();

            setHitArea({
                position: map.clientPointToLatLng(rect.left, rect.top),
                width: rect.width,
                height: rect.height,
            });
        };

        updateHitArea();

        const resizeObserver = new ResizeObserver(updateHitArea);

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();

            dragStateRef.current = null;
            pathRef.current = [];
            setHitArea(null);
            setDraftPath([]);
        };
    }, [enabled, map]);

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || !map) return;

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);

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

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;

        // 드래그 중이 아니거나 다른 포인터 이벤트면 무시
        if (!dragState || dragState.pointerId !== event.pointerId || !map) return;

        event.preventDefault();

        const currentPoint = toPoint(event);
        const distanceFromStart = getDistance(dragState.startPoint, currentPoint);

        if (!dragState.isDrawing && distanceFromStart <= MOVE_BEGIN_THRESHOLD_PX) return;

        const currentLatLng = map.clientPointToLatLng(event.clientX, event.clientY);

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

    const handlePointerUpOrCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;

        // 현재 진행 중인 드래그 이벤트가 아니면 무시
        if (!dragState || dragState.pointerId !== event.pointerId || !map) return;

        dragStateRef.current = null;
        setDraftPath([]);

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        if (dragState.isDrawing && event.type === "pointerup") {
            const completedPath = appendEndPoint(pathRef.current, dragState.lastSamplePoint, event, map);

            if (completedPath.length >= 3) {
                onCompleteRef.current(completedPath);
            }
        }

        pathRef.current = [];
    };

    return (
        <>
            {enabled && hitArea && (
                <Map.CustomOverlay
                    position={hitArea.position}
                    clickable
                    xAnchor={0}
                    yAnchor={0}
                    zIndex={MAP_Z_INDEX.lasso}
                >
                    <div
                        style={{
                            width: hitArea.width,
                            height: hitArea.height,
                            cursor: "crosshair",
                            touchAction: "none",
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUpOrCancel}
                        onPointerCancel={handlePointerUpOrCancel}
                    />
                </Map.CustomOverlay>
            )}

            {draftPath.length >= 3 && (
                <Map.Polygon
                    path={draftPath}
                    strokeWeight={4}
                    strokeColor="#f0c243"
                    strokeOpacity={1}
                    strokeStyle="solid"
                    fillColor="#f0c243"
                    fillOpacity={0.32}
                    zIndex={MAP_Z_INDEX.lasso}
                />
            )}
        </>
    );
}

function appendEndPoint(
    path: LatLng[],
    lastSamplePoint: Point,
    event: Pick<PointerEvent, "clientX" | "clientY">,
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

function toPoint(event: Pick<PointerEvent, "clientX" | "clientY">): Point {
    return {
        x: event.clientX,
        y: event.clientY,
    };
}

function getDistance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
