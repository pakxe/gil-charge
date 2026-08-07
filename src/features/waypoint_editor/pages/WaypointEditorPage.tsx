import { Map } from "@/shared/ui/Map/Map";
import type { LatLng } from "@/shared/model/map";
import { useWaypointEditor } from "@/features/waypoint_editor/hooks/useWaypointEditor";
import { WaypointEdgesLayer } from "@/features/waypoint_editor/ui/WaypointEdgesLayer";
import { WaypointNodesLayer } from "@/features/waypoint_editor/ui/WaypointNodesLayer";
import Box from "@/shared/components/Box/Box";
import { cn } from "@/shared/utils/cn";

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
                {/* <WaypointEdgesLayer waypoints={data.visibleWaypoints} /> */}
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
        </main>
    );
}
