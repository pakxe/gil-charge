import { useCallback, useEffect, useRef } from "react";
import { CustomOverlayMap, useMap } from "react-kakao-maps-sdk";

import type { LatLng } from "@/shared/types/map";
import { cn } from "@/shared/utils/cn";
import { MAP_Z_INDEX } from "@/shared/constants/map";
import { Polyline } from "@/shared/ui/Map/Polyline";

interface props {
    waypoints: LatLng[];
    selectedIndex?: number | null;
    isDraggable?: boolean;
    onWaypointClick?: (index: number) => void;
    onWaypointDragStart?: (index: number, latLng: LatLng) => void;
    onWaypointDragMove?: (index: number, latLng: LatLng) => void;
    onWaypointDragEnd?: () => void;
    onWaypointDelete?: (index: number) => void;
}

type DragState = {
    index: number;
    pointerId: number;
};

export function KakaoWaypoints({
    waypoints,
    selectedIndex = null,
    isDraggable = false,
    onWaypointClick,
    onWaypointDragStart,
    onWaypointDragMove,
    onWaypointDragEnd,
    onWaypointDelete,
}: props) {
    const map = useMap("WaypointMarkers");

    // 다른 손가락으로 이벤트가 옮겨가는걸 방지
    const dragStateRef = useRef<DragState | null>(null);

    // 클릭했을 때 dragmove 실행되는걸 방지
    const dragCountRef = useRef(0);

    const getLatLngFromPointer = useCallback(
        (clientX: number, clientY: number): LatLng => {
            const rect = map.getNode().getBoundingClientRect();
            const point = new kakao.maps.Point(clientX - rect.left, clientY - rect.top);
            const latLng = map.getProjection().coordsFromContainerPoint(point);

            return {
                lat: latLng.getLat(),
                lng: latLng.getLng(),
            };
        },
        [map],
    );

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            const dragState = dragStateRef.current;

            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            if (dragCountRef.current <= 5) {
                dragCountRef.current = dragCountRef.current += 1;
                return;
            }

            onWaypointDragMove?.(dragState.index, getLatLngFromPointer(event.clientX, event.clientY));
        };

        const handlePointerUp = (event: PointerEvent) => {
            const dragState = dragStateRef.current;

            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            dragStateRef.current = null;
            onWaypointDragEnd?.();
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [getLatLngFromPointer, onWaypointDragEnd, onWaypointDragMove]);

    return (
        <>
            {waypoints.length > 1 && (
                <Polyline
                    path={waypoints}
                    strokeWeight={4}
                    strokeColor={"#111827"}
                    strokeOpacity={0.7}
                    strokeStyle={"solid"}
                    zIndex={MAP_Z_INDEX.waypoint - 1}
                />
            )}
            {waypoints.map((waypoint, index) => {
                const isSelected = selectedIndex === index;

                return (
                    <CustomOverlayMap
                        key={`waypoint-${index}`}
                        position={waypoint}
                        clickable
                        zIndex={isSelected ? MAP_Z_INDEX.selectedWaypoint : MAP_Z_INDEX.waypoint}
                    >
                        <div
                            className="relative touch-none select-none"
                            onClick={() => {
                                if (dragCountRef.current) {
                                    dragCountRef.current = 0;
                                    return;
                                }

                                onWaypointClick?.(index);
                            }}
                            onPointerDown={(event) => {
                                dragCountRef.current = 0;

                                if (!isDraggable) {
                                    return;
                                }

                                dragStateRef.current = {
                                    index,
                                    pointerId: event.pointerId, // pointerId는 사용중인 포인터의 고유 식별자
                                };

                                onWaypointDragStart?.(index, getLatLngFromPointer(event.clientX, event.clientY));
                            }}
                        >
                            <button
                                type="button"
                                aria-label={`${index + 1}번째 경유지`}
                                className={cn(
                                    "flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-gray-950 bg-yellow-500 px-2 text-xs font-black text-gray-950 shadow-lg transition-transform",
                                    isDraggable && "cursor-grab active:cursor-grabbing",
                                    isSelected && "scale-110 border-white ring-2 ring-yellow-300",
                                )}
                            >
                                {index + 1}
                            </button>

                            {isSelected && onWaypointDelete && (
                                <button
                                    type="button"
                                    aria-label={`${index + 1}번째 경유지 삭제`}
                                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-950 text-xs font-bold leading-none text-white shadow-md"
                                    onPointerDown={(event) => {
                                        event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onWaypointDelete(index);
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </CustomOverlayMap>
                );
            })}
        </>
    );
}
