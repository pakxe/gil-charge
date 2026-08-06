import { describe, expect, it } from "vitest";
import { createWaypointEditor, type WaypointEditorState } from "@/features/waypoint_editor/model/waypointEditor";
import type { LatLng } from "@/shared/model/map";

const latLngA: LatLng = {
    lat: 37.5665,
    lng: 126.978,
};

const latLngB: LatLng = {
    lat: 35.1796,
    lng: 129.0756,
};

describe("waypointEditor", () => {
    it("idle 상태에서 좌표를 추가하면 웨이포인트 목록 끝에 추가한다", () => {
        const editor = createWaypointEditor({ createId: () => "waypoint-1" });
        const state = editor.createInitialState();

        const next = editor.addWaypoint(state, latLngA);

        expect(next.result).toEqual({
            code: 0,
            node: {
                id: "waypoint-1",
                latLng: latLngA,
            },
        });
        expect(next.state.nodes).toEqual([
            {
                id: "waypoint-1",
                latLng: latLngA,
            },
        ]);
        expect(next.state.status).toEqual({ state: "idle" });
    });

    it("selected 상태에서 좌표를 추가하면 웨이포인트를 추가하고 idle 상태로 변경한다", () => {
        const editor = createWaypointEditor({ createId: () => "waypoint-2" });
        const state: WaypointEditorState = {
            nodes: [
                {
                    id: "waypoint-1",
                    latLng: latLngA,
                },
            ],
            status: {
                state: "selected",
                selectedNodeId: "waypoint-1",
            },
        };

        const next = editor.addWaypoint(state, latLngB);

        expect(next.state.nodes).toEqual([
            {
                id: "waypoint-1",
                latLng: latLngA,
            },
            {
                id: "waypoint-2",
                latLng: latLngB,
            },
        ]);
        expect(next.state.status).toEqual({ state: "idle" });
    });

    it("웨이포인트가 19개일 때 1개를 추가하면 총 20개가 되고 성공 결과를 반환한다", () => {
        const id = 20;
        const editor = createWaypointEditor({ createId: () => `waypoint-${id}` });
        const state: WaypointEditorState = {
            nodes: Array.from({ length: 19 }, (_, index) => ({
                id: `waypoint-${index + 1}`,
                latLng: latLngA,
            })),
            status: { state: "idle" },
        };

        const next = editor.addWaypoint(state, latLngB);

        expect(next.result).toEqual({
            code: 0,
            node: {
                id: "waypoint-20",
                latLng: latLngB,
            },
        });
        expect(next.state.nodes).toHaveLength(20);
    });

    it("웨이포인트가 20개일 때 추가하면 OVERFLOW를 반환하고 상태를 변경하지 않는다", () => {
        const editor = createWaypointEditor({ createId: () => "waypoint-21" });
        const state: WaypointEditorState = {
            nodes: Array.from({ length: 20 }, (_, index) => ({
                id: `waypoint-${index + 1}`,
                latLng: latLngA,
            })),
            status: { state: "idle" },
        };

        const next = editor.addWaypoint(state, latLngB);

        expect(next.result).toEqual({
            code: 1,
            reason: "OVERFLOW",
        });
        expect(next.state).toBe(state);
    });

    it("생성된 노드 id는 주입한 id 생성기의 반환값을 사용한다", () => {
        const editor = createWaypointEditor({ createId: () => "fixed-id" });
        const state = editor.createInitialState();

        const next = editor.addWaypoint(state, latLngA);

        expect(next.result).toEqual({
            code: 0,
            node: {
                id: "fixed-id",
                latLng: latLngA,
            },
        });
    });

    it("기존 노드가 있을 때 새 좌표를 추가하면 기존 순서를 유지하고 새 노드를 끝에 추가한다", () => {
        const editor = createWaypointEditor({ createId: () => "waypoint-3" });
        const state: WaypointEditorState = {
            nodes: [
                {
                    id: "waypoint-1",
                    latLng: latLngA,
                },
                {
                    id: "waypoint-2",
                    latLng: latLngB,
                },
            ],
            status: { state: "idle" },
        };

        const next = editor.addWaypoint(state, {
            lat: 37.4563,
            lng: 126.7052,
        });

        expect(next.state.nodes.map((node) => node.id)).toEqual(["waypoint-1", "waypoint-2", "waypoint-3"]);
    });
});
