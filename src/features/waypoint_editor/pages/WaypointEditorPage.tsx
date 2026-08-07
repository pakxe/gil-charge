import { Map } from "@/shared/ui/Map/Map";
import type { LatLng } from "@/shared/model/map";
import { MAX_WAYPOINT_COUNT } from "@/features/waypoint_editor/model/waypointEditor";
import { useWaypointEditor } from "@/features/waypoint_editor/hooks/useWaypointEditor";
import { WaypointEdgesLayer } from "@/features/waypoint_editor/ui/WaypointEdgesLayer";
import { WaypointNodesLayer } from "@/features/waypoint_editor/ui/WaypointNodesLayer";

const INITIAL_CENTER: LatLng = {
    lat: 37.5665,
    lng: 126.978,
};

export function WaypointEditorPage() {
    const { status, data, actions } = useWaypointEditor();

    return (
        <main className="relative min-h-dvh bg-gil-gray-950 text-gil-light-text">
            <Map
                center={INITIAL_CENTER}
                zoomLevel={8}
                isDraggable={status.statusName !== "moving"}
                isZoomable
                className="min-h-dvh w-full"
                loadingFallback={<div className="flex min-h-dvh items-center justify-center">loading</div>}
                errorFallback={<div className="flex min-h-dvh items-center justify-center">error</div>}
                onClick={(latLng) => {
                    actions.addWaypoint(latLng);
                }}
            >
                <WaypointEdgesLayer waypoints={data.visibleWaypoints} />
                <WaypointNodesLayer
                    waypoints={data.visibleWaypoints}
                    status={status}
                    onWaypointClick={actions.selectWaypoint}
                    onWaypointDelete={actions.deleteWaypoint}
                    onWaypointMoveBegin={actions.beginWaypointMove}
                    onWaypointMoveUpdate={actions.updateWaypointMove}
                    onWaypointMoveCommit={actions.commitWaypointMove}
                />
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
                    }}
                >
                    전체 삭제
                </button>
                {data.result?.code === 1 && <p className="mt-1 text-gil-yellow-400">{data.result.reason}</p>}
            </section>
        </main>
    );
}
