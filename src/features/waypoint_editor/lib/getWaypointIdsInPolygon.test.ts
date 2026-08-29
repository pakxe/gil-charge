import { describe, expect, it } from "vitest";
import { getWaypointIdsInPolygon } from "@/features/waypoint_editor/lib/getWaypointIdsInPolygon";
import type { WaypointNode } from "@/features/waypoint_editor/model/waypointEditor";
import type { LatLng } from "@/shared/model/map";

const polygonPath: LatLng[] = [
    { lat: 35, lng: 127 },
    { lat: 35, lng: 128 },
    { lat: 36, lng: 128 },
    { lat: 36, lng: 127 },
];

describe("getWaypointIdsInPolygon", () => {
    it("polygon 내부 waypoint id를 waypoint 배열 순서대로 반환한다", () => {
        const waypoints: WaypointNode[] = [
            { id: "waypoint-1", latLng: { lat: 35.5, lng: 127.5 } },
            { id: "waypoint-2", latLng: { lat: 36.5, lng: 127.5 } },
            { id: "waypoint-3", latLng: { lat: 35.25, lng: 127.25 } },
        ];

        expect(getWaypointIdsInPolygon(waypoints, polygonPath)).toEqual(["waypoint-1", "waypoint-3"]);
    });

    it("polygon 내부 waypoint가 없으면 빈 배열을 반환한다", () => {
        const waypoints: WaypointNode[] = [
            { id: "waypoint-1", latLng: { lat: 36.5, lng: 127.5 } },
            { id: "waypoint-2", latLng: { lat: 34.5, lng: 127.5 } },
        ];

        expect(getWaypointIdsInPolygon(waypoints, polygonPath)).toEqual([]);
    });

    it("polygon 경계선 위 waypoint id도 포함한다", () => {
        const waypoints: WaypointNode[] = [{ id: "waypoint-1", latLng: { lat: 35.5, lng: 127 } }];

        expect(getWaypointIdsInPolygon(waypoints, polygonPath)).toEqual(["waypoint-1"]);
    });
});
