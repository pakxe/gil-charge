import type { WaypointNode, WaypointNodeId } from "@/features/waypoint_editor/model/waypointEditor";
import type { LatLng } from "@/shared/model/map";
import { pointInPolygon } from "@/shared/lib/pointInPolygon";

export function getWaypointIdsInPolygon(waypoints: WaypointNode[], polygonPath: LatLng[]): WaypointNodeId[] {
    return waypoints.filter((waypoint) => pointInPolygon(waypoint.latLng, polygonPath)).map((waypoint) => waypoint.id);
}
