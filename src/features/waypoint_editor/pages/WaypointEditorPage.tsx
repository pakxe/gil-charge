import { useState } from "react";
import { Map } from "@/shared/ui/Map/Map";
import type { LatLng } from "@/shared/model/map";
import {
    MAX_WAYPOINT_COUNT,
    type AddWaypointResult,
    type WaypointEditorStatus,
} from "@/features/waypoint_editor/model/waypointEditor";
import { useWaypointEditor } from "@/features/waypoint_editor/hooks/useWaypointEditor";

const INITIAL_CENTER: LatLng = {
    lat: 37.5665,
    lng: 126.978,
};

export function WaypointEditorPage() {
    const { state, data, actions } = useWaypointEditor();
    const [lastResult, setLastResult] = useState<AddWaypointResult | null>(null);

    return (
        <main className="relative min-h-dvh bg-gil-gray-950 text-gil-light-text">
            <Map
                center={INITIAL_CENTER}
                zoomLevel={8}
                isDraggable
                isZoomable
                className="min-h-dvh w-full"
                loadingFallback={<div className="flex min-h-dvh items-center justify-center">loading</div>}
                errorFallback={<div className="flex min-h-dvh items-center justify-center">error</div>}
                onClick={(latLng) => {
                    setLastResult(actions.addWaypoint(latLng));
                }}
            >
                {data.waypoints.map((waypoint, index) => (
                    <Map.CustomOverlay key={waypoint.id} position={waypoint.latLng} zIndex={30}>
                        <div
                            className="relative"
                            onClick={(event) => {
                                event.stopPropagation();
                                actions.selectWaypoint(waypoint.id);
                            }}
                        >
                            <button
                                type="button"
                                className={[
                                    "flex h-8 min-w-8 items-center justify-center rounded-full border-2 px-2 text-xs font-black shadow-lg",
                                    isSelectedWaypoint(state, waypoint.id)
                                        ? "border-white bg-gil-yellow-400 text-gray-950 ring-2 ring-gil-yellow-400"
                                        : "border-gray-950 bg-gil-yellow-400 text-gray-950",
                                ].join(" ")}
                            >
                                {index + 1}
                            </button>

                            {isSelectedWaypoint(state, waypoint.id) && (
                                <button
                                    type="button"
                                    aria-label={`${index + 1}번째 웨이포인트 삭제`}
                                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-950 text-xs font-bold leading-none text-white shadow-md"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        actions.deleteWaypoint(waypoint.id);
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </Map.CustomOverlay>
                ))}
            </Map>

            <section className="absolute left-4 top-4 z-10 rounded-lg border border-white/10 bg-gray-950/85 px-4 py-3 text-sm shadow-lg backdrop-blur-sm">
                <p className="font-bold">
                    웨이포인트 {data.waypoints.length} / {MAX_WAYPOINT_COUNT}
                </p>
                <button
                    type="button"
                    className="mt-2 rounded-md border border-white/10 bg-gil-yellow-400 px-3 py-1 text-xs font-bold text-gray-950 disabled:opacity-50"
                    disabled={data.waypoints.length === 0}
                    onClick={() => {
                        actions.deleteAllWaypoint();
                        setLastResult(null);
                    }}
                >
                    전체 삭제
                </button>
                {lastResult?.code === 1 && <p className="mt-1 text-gil-yellow-400">{lastResult.reason}</p>}
            </section>
        </main>
    );
}

function isSelectedWaypoint(state: WaypointEditorStatus, waypointId: string) {
    return state.state === "selected" && state.selectedNodeId === waypointId;
}
