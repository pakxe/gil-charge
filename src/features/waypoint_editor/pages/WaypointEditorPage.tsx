import { Map } from "@/shared/ui/Map/Map";
import type { LatLng } from "@/shared/model/map";
import { useWaypointEditor } from "@/features/waypoint_editor/hooks/useWaypointEditor";
import { WaypointNodesLayer } from "@/features/waypoint_editor/ui/WaypointNodesLayer";
import { WaypointHistoryControls } from "@/features/waypoint_editor/ui/WaypointHistoryControls";

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
                isDraggable={!isMoveActive(status.statusName)}
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
                    onWaypointBatchMoveBegin={actions.beginBatchMove}
                    onWaypointBatchMoveUpdate={actions.updateBatchMove}
                    onWaypointBatchMoveCommit={actions.commitBatchMove}
                />
            </Map>
            <WaypointHistoryControls
                canUndo={data.canUndo}
                canRedo={data.canRedo}
                onUndo={actions.undoWaypoint}
                onRedo={actions.redoWaypoint}
                className="absolute right-4 top-4 z-10"
            />
        </main>
    );
}

function isMoveActive(statusName: string) {
    return statusName === "moving" || statusName === "batchMoving";
}
