import { useState } from "react";
import { Map } from "@/shared/ui/Map/Map";
import type { LatLng } from "@/shared/model/map";
import { MAX_WAYPOINT_COUNT, type AddWaypointResult } from "@/features/waypoint_editor/model/waypointEditor";
import { useWaypointEditor } from "@/features/waypoint_editor/hooks/useWaypointEditor";

const INITIAL_CENTER: LatLng = {
    lat: 37.5665,
    lng: 126.978,
};

export function WaypointEditorPage() {
    const { data, actions } = useWaypointEditor();
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
                        <div className="flex h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gray-950 bg-gil-yellow-400 px-2 text-xs font-black text-gray-950 shadow-lg">
                            {index + 1}
                        </div>
                    </Map.CustomOverlay>
                ))}
            </Map>

            <section className="absolute left-4 top-4 z-10 rounded-lg border border-white/10 bg-gray-950/85 px-4 py-3 text-sm shadow-lg backdrop-blur-sm">
                <p className="font-bold">웨이포인트 {data.waypoints.length} / {MAX_WAYPOINT_COUNT}</p>
                {lastResult?.code === 1 && <p className="mt-1 text-gil-yellow-400">{lastResult.reason}</p>}
            </section>
        </main>
    );
}
