import { useMemo } from "react";
import type { WaypointNode } from "@/features/waypoint_editor/model/waypointEditor";
import { MAP_Z_INDEX } from "@/shared/constants/map";
import { Map } from "@/shared/ui/Map/Map";

type Props = {
    waypoints: WaypointNode[];
    weight: number;
};

export function WaypointEdgesLayer({ waypoints, weight }: Props) {
    const path = useMemo(() => waypoints.map((waypoint) => waypoint.latLng), [waypoints]);

    return (
        <>
            <Map.Polyline
                path={path}
                strokeWeight={6}
                strokeColor={"#DEA60C"}
                strokeOpacity={1}
                strokeStyle={"solid"}
                zIndex={MAP_Z_INDEX.waypoint - 1}
            />
            <Map.Polyline
                path={path}
                strokeWeight={weight}
                strokeColor={"#f0c243"}
                strokeOpacity={0.4}
                strokeStyle={"solid"}
                zIndex={MAP_Z_INDEX.waypoint - 1}
            />
        </>
    );
}
