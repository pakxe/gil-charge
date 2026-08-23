import { useCallback, useRef } from "react";
import {
    type WaypointEditorStatus,
    type WaypointNode,
    type WaypointNodeId,
} from "@/features/waypoint_editor/model/waypointEditor";
import type { LatLng } from "@/shared/model/map";
import { useMap } from "@/shared/model/useMap";
import { MAP_Z_INDEX } from "@/shared/constants/map";
import { Map } from "@/shared/ui/Map/Map";

const MOVE_BEGIN_THRESHOLD_PX = 4;

type Props = {
    waypoints: WaypointNode[];
    status: WaypointEditorStatus;
    onWaypointClick: (id: WaypointNodeId) => void;
    onWaypointDelete: (id: WaypointNodeId) => void;
    onWaypointMoveBegin: (id: WaypointNodeId, latLng: LatLng) => void;
    onWaypointMoveUpdate: (id: WaypointNodeId, latLng: LatLng) => void;
    onWaypointMoveCommit: () => void;
    onWaypointBatchMoveBegin: (ids: WaypointNodeId[], latLng: LatLng) => void;
    onWaypointBatchMoveUpdate: (latLng: LatLng) => void;
    onWaypointBatchMoveCommit: () => void;
};

export function WaypointNodesLayer({
    waypoints,
    status,
    onWaypointClick,
    onWaypointDelete,
    onWaypointMoveBegin,
    onWaypointMoveUpdate,
    onWaypointMoveCommit,
    onWaypointBatchMoveBegin,
    onWaypointBatchMoveUpdate,
    onWaypointBatchMoveCommit,
}: Props) {
    const map = useMap();
    const isDraggingRef = useRef(false);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);

    const getLatLngFromPointer = useCallback(
        (clientX: number, clientY: number): LatLng | null => {
            if (!map) {
                return null;
            }

            return map.clientPointToLatLng(clientX, clientY);
        },
        [map],
    );

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, waypointId: WaypointNodeId) => {
        event.stopPropagation();

        if (event.button !== 0 || !map) {
            return;
        }

        isDraggingRef.current = false;
        startPosRef.current = {
            x: event.clientX,
            y: event.clientY,
        };

        let activeMoveMode: "single" | "batch" | null = null;

        const handlePointerMove = (e: PointerEvent) => {
            const startPos = startPosRef.current;
            if (!startPos) return;

            if (!isDraggingRef.current) {
                const dx = Math.abs(e.clientX - startPos.x);
                const dy = Math.abs(e.clientY - startPos.y);

                if (dx <= MOVE_BEGIN_THRESHOLD_PX && dy <= MOVE_BEGIN_THRESHOLD_PX) {
                    return;
                }
            }

            const latLng = getLatLngFromPointer(e.clientX, e.clientY);
            if (!latLng) return;

            if (!isDraggingRef.current) {
                isDraggingRef.current = true;
                const batchMoveIds = getBatchMoveIds(status, waypointId);

                if (batchMoveIds) {
                    activeMoveMode = "batch";
                    onWaypointBatchMoveBegin(batchMoveIds, latLng);
                    onWaypointBatchMoveUpdate(latLng);
                    return;
                }

                activeMoveMode = "single";
                onWaypointMoveBegin(waypointId, latLng);
            }

            if (activeMoveMode === "batch") {
                onWaypointBatchMoveUpdate(latLng);
                return;
            }

            onWaypointMoveUpdate(waypointId, latLng);
        };

        const handlePointerUpOrCancel = () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUpOrCancel);
            window.removeEventListener("pointercancel", handlePointerUpOrCancel);

            startPosRef.current = null;

            if (isDraggingRef.current) {
                if (activeMoveMode === "batch") {
                    onWaypointBatchMoveCommit();
                } else {
                    onWaypointMoveCommit();
                }
            }
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUpOrCancel);
        window.addEventListener("pointercancel", handlePointerUpOrCancel);
    };

    return (
        <>
            {waypoints.map((waypoint, index) => {
                const isSelected = isSelectedWaypoint(status, waypoint.id);
                const isMoving = isMovingWaypoint(status, waypoint.id);
                const isActive = isSelected || isMoving;

                return (
                    <Map.CustomOverlay
                        key={waypoint.id}
                        position={waypoint.latLng}
                        clickable
                        zIndex={isActive ? MAP_Z_INDEX.selectedWaypoint : MAP_Z_INDEX.waypoint}
                    >
                        <div
                            className="relative touch-none select-none"
                            onClick={(event) => {
                                event.stopPropagation();

                                if (isDraggingRef.current) {
                                    event.preventDefault();
                                    isDraggingRef.current = false;
                                    return;
                                }

                                onWaypointClick(waypoint.id);
                            }}
                            onPointerDown={(event) => handlePointerDown(event, waypoint.id)}
                        >
                            <button
                                type="button"
                                aria-label={`${index + 1}번째 웨이포인트`}
                                className={[
                                    "flex h-8 min-w-8 cursor-grab items-center justify-center rounded-full border-2 px-2 text-xs font-black shadow-lg active:cursor-grabbing",
                                    isActive
                                        ? "border-white border-3 bg-gil-yellow-400 text-gray-950 ring-3 ring-gil-brown-900"
                                        : "border-white border-3 bg-gil-yellow-400 text-gray-950",
                                ].join(" ")}
                            >
                                {index + 1}
                            </button>

                            {isSelected && (
                                <button
                                    type="button"
                                    aria-label={`${index + 1}번째 웨이포인트 삭제`}
                                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-950 text-xs font-bold leading-none text-white shadow-md"
                                    onPointerDown={(event) => {
                                        event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onWaypointDelete(waypoint.id);
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </Map.CustomOverlay>
                );
            })}
        </>
    );
}

function isSelectedWaypoint(status: WaypointEditorStatus, waypointId: WaypointNodeId) {
    return status.statusName === "selected" && status.selectedNodeIds.includes(waypointId);
}

function isMovingWaypoint(status: WaypointEditorStatus, waypointId: WaypointNodeId) {
    return (
        (status.statusName === "moving" && status.movingNodeId === waypointId) ||
        isBatchMovingWaypoint(status, waypointId)
    );
}

function isBatchMovingWaypoint(status: WaypointEditorStatus, waypointId: WaypointNodeId) {
    return status.statusName === "batchMoving" && status.movingNodeIds.includes(waypointId);
}

function getBatchMoveIds(status: WaypointEditorStatus, waypointId: WaypointNodeId): WaypointNodeId[] | null {
    if (status.statusName !== "selected" || !status.selectedNodeIds.includes(waypointId)) {
        return null;
    }

    if (status.selectedNodeIds.length < 2) {
        return null;
    }

    return status.selectedNodeIds;
}
