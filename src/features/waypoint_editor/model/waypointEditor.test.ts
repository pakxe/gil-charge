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

const latLngC: LatLng = {
    lat: 37.4563,
    lng: 126.7052,
};

const latLngD: LatLng = {
    lat: 36.3504,
    lng: 127.3845,
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

    it("존재하는 웨이포인트 id를 선택하면 selected 상태가 된다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints([
            ["waypoint-1", latLngA],
        ]);

        const next = editor.selectWaypoint(state, "waypoint-1");

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.status).toEqual({
            state: "selected",
            selectedNodeId: "waypoint-1",
        });
    });

    it("이미 선택된 웨이포인트 id를 다시 선택하면 idle 상태가 된다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints(
            [["waypoint-1", latLngA]],
            {
                state: "selected",
                selectedNodeId: "waypoint-1",
            },
        );

        const next = editor.selectWaypoint(state, "waypoint-1");

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.status).toEqual({ state: "idle" });
    });

    it("다른 웨이포인트 id를 선택하면 selectedNodeId를 변경한다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints(
            [
                ["waypoint-1", latLngA],
                ["waypoint-2", latLngB],
            ],
            {
                state: "selected",
                selectedNodeId: "waypoint-1",
            },
        );

        const next = editor.selectWaypoint(state, "waypoint-2");

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.status).toEqual({
            state: "selected",
            selectedNodeId: "waypoint-2",
        });
    });

    it("존재하지 않는 웨이포인트 id를 선택하면 INVALID_INPUT을 반환하고 상태를 변경하지 않는다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints([
            ["waypoint-1", latLngA],
        ]);

        const next = editor.selectWaypoint(state, "missing-waypoint");

        expect(next.result).toEqual({
            code: 2,
            reason: "INVALID_INPUT",
        });
        expect(next.state).toBe(state);
    });

    it("존재하는 웨이포인트 id로 이동을 시작하면 moving 상태가 된다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints([
            ["waypoint-1", latLngA],
        ]);

        const next = editor.beginWaypointMove(state, "waypoint-1", latLngB);

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.status).toEqual({
            state: "moving",
            movingNodeId: "waypoint-1",
            latLng: latLngB,
            selectionAfterMove: null,
        });
        expect(next.state.nodes).toEqual(state.nodes);
    });

    it("존재하지 않는 웨이포인트 id로 이동을 시작하면 INVALID_INPUT을 반환하고 상태를 변경하지 않는다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints([
            ["waypoint-1", latLngA],
        ]);

        const next = editor.beginWaypointMove(state, "missing-waypoint", latLngB);

        expect(next.result).toEqual({
            code: 2,
            reason: "INVALID_INPUT",
        });
        expect(next.state).toBe(state);
    });

    it("이미 moving 상태이면 이동 시작 요청을 실패시키고 상태를 변경하지 않는다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints(
            [["waypoint-1", latLngA]],
            {
                state: "moving",
                movingNodeId: "waypoint-1",
                latLng: latLngB,
                selectionAfterMove: null,
            },
        );

        const next = editor.beginWaypointMove(state, "waypoint-1", latLngC);

        expect(next.result).toEqual({
            code: 2,
            reason: "INVALID_INPUT",
        });
        expect(next.state).toBe(state);
    });

    it("이동 중 좌표를 변경하면 draft 좌표만 변경하고 확정 nodes는 변경하지 않는다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints(
            [["waypoint-1", latLngA]],
            {
                state: "moving",
                movingNodeId: "waypoint-1",
                latLng: latLngB,
                selectionAfterMove: null,
            },
        );

        const next = editor.updateWaypointMove(state, "waypoint-1", latLngC);

        expect(next.nodes).toEqual([
            {
                id: "waypoint-1",
                latLng: latLngA,
            },
        ]);
        expect(next.status).toEqual({
            state: "moving",
            movingNodeId: "waypoint-1",
            latLng: latLngC,
            selectionAfterMove: null,
        });
    });

    it("moving 상태가 아니거나 이동 중인 id가 다르면 이동 중 좌표 변경 요청을 무시한다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const idleState = createStateWithWaypoints([
            ["waypoint-1", latLngA],
        ]);
        const movingState = createStateWithWaypoints(
            [
                ["waypoint-1", latLngA],
                ["waypoint-2", latLngB],
            ],
            {
                state: "moving",
                movingNodeId: "waypoint-1",
                latLng: latLngC,
                selectionAfterMove: null,
            },
        );

        expect(editor.updateWaypointMove(idleState, "waypoint-1", latLngB)).toBe(idleState);
        expect(editor.updateWaypointMove(movingState, "waypoint-2", latLngD)).toBe(movingState);
    });

    it("이동을 확정하면 draft 좌표를 확정 nodes에 반영하고 idle 상태가 된다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints(
            [
                ["waypoint-1", latLngA],
                ["waypoint-2", latLngB],
            ],
            {
                state: "moving",
                movingNodeId: "waypoint-2",
                latLng: latLngC,
                selectionAfterMove: null,
            },
        );

        const next = editor.commitWaypointMove(state);

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.nodes).toEqual([
            {
                id: "waypoint-1",
                latLng: latLngA,
            },
            {
                id: "waypoint-2",
                latLng: latLngC,
            },
        ]);
        expect(next.state.status).toEqual({ state: "idle" });
    });

    it("선택된 웨이포인트를 이동하면 확정 후 선택 상태를 유지한다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const selectedState = createStateWithWaypoints(
            [["waypoint-1", latLngA]],
            {
                state: "selected",
                selectedNodeId: "waypoint-1",
            },
        );

        const movingState = editor.beginWaypointMove(selectedState, "waypoint-1", latLngB).state;
        const next = editor.commitWaypointMove(movingState);

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.nodes).toEqual([
            {
                id: "waypoint-1",
                latLng: latLngB,
            },
        ]);
        expect(next.state.status).toEqual({
            state: "selected",
            selectedNodeId: "waypoint-1",
        });
    });

    it("선택되지 않은 웨이포인트를 이동하면 확정 후 기존 선택을 해제한다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const selectedState = createStateWithWaypoints(
            [
                ["waypoint-1", latLngA],
                ["waypoint-2", latLngB],
            ],
            {
                state: "selected",
                selectedNodeId: "waypoint-1",
            },
        );

        const movingState = editor.beginWaypointMove(selectedState, "waypoint-2", latLngC).state;
        const next = editor.commitWaypointMove(movingState);

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.nodes).toEqual([
            {
                id: "waypoint-1",
                latLng: latLngA,
            },
            {
                id: "waypoint-2",
                latLng: latLngC,
            },
        ]);
        expect(next.state.status).toEqual({ state: "idle" });
    });

    it("moving 상태가 아닐 때 이동 확정을 요청하면 INVALID_INPUT을 반환하고 상태를 변경하지 않는다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints([
            ["waypoint-1", latLngA],
        ]);

        const next = editor.commitWaypointMove(state);

        expect(next.result).toEqual({
            code: 2,
            reason: "INVALID_INPUT",
        });
        expect(next.state).toBe(state);
    });

    it("유효하지 않은 위치로 이동을 확정하면 기존 좌표를 유지하고 선택 상태를 복원한다", () => {
        const editor = createWaypointEditor({
            createId: () => "unused",
            isValidLatLng: () => false,
        });
        const state = createStateWithWaypoints(
            [["waypoint-1", latLngA]],
            {
                state: "moving",
                movingNodeId: "waypoint-1",
                latLng: latLngB,
                selectionAfterMove: "waypoint-1",
            },
        );

        const next = editor.commitWaypointMove(state);

        expect(next.result).toEqual({
            code: 2,
            reason: "INVALID_INPUT",
        });
        expect(next.state.nodes).toEqual([
            {
                id: "waypoint-1",
                latLng: latLngA,
            },
        ]);
        expect(next.state.status).toEqual({
            state: "selected",
            selectedNodeId: "waypoint-1",
        });
    });

    it("웨이포인트가 3개 있을 때 2번 id로 삭제하면 1번과 3번의 상대 순서를 유지한다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints([
            ["waypoint-1", latLngA],
            ["waypoint-2", latLngB],
            ["waypoint-3", latLngC],
        ]);

        const next = editor.deleteWaypoint(state, "waypoint-2");

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.nodes.map((node) => node.id)).toEqual(["waypoint-1", "waypoint-3"]);
    });

    it("선택된 웨이포인트를 삭제하면 상태가 idle이 된다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints(
            [
                ["waypoint-1", latLngA],
                ["waypoint-2", latLngB],
            ],
            {
                state: "selected",
                selectedNodeId: "waypoint-2",
            },
        );

        const next = editor.deleteWaypoint(state, "waypoint-2");

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.nodes.map((node) => node.id)).toEqual(["waypoint-1"]);
        expect(next.state.status).toEqual({ state: "idle" });
    });

    it("선택되지 않은 웨이포인트를 삭제하면 기존 선택 상태를 유지한다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints(
            [
                ["waypoint-1", latLngA],
                ["waypoint-2", latLngB],
                ["waypoint-3", latLngC],
            ],
            {
                state: "selected",
                selectedNodeId: "waypoint-1",
            },
        );

        const next = editor.deleteWaypoint(state, "waypoint-2");

        expect(next.result).toEqual({ code: 0 });
        expect(next.state.nodes.map((node) => node.id)).toEqual(["waypoint-1", "waypoint-3"]);
        expect(next.state.status).toEqual({
            state: "selected",
            selectedNodeId: "waypoint-1",
        });
    });

    it("존재하지 않는 웨이포인트 id로 삭제하면 INVALID_INPUT을 반환하고 상태를 변경하지 않는다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints([
            ["waypoint-1", latLngA],
        ]);

        const next = editor.deleteWaypoint(state, "missing-waypoint");

        expect(next.result).toEqual({
            code: 2,
            reason: "INVALID_INPUT",
        });
        expect(next.state).toBe(state);
    });

    it("웨이포인트가 여러 개 있을 때 전체 삭제하면 nodes는 빈 배열이 되고 상태는 idle이 된다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints([
            ["waypoint-1", latLngA],
            ["waypoint-2", latLngB],
        ]);

        const next = editor.deleteAllWaypoint(state);

        expect(next.result).toBeUndefined();
        expect(next.state.nodes).toEqual([]);
        expect(next.state.status).toEqual({ state: "idle" });
    });

    it("selected 상태에서 전체 삭제하면 nodes는 빈 배열이 되고 상태는 idle이 된다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = createStateWithWaypoints(
            [
                ["waypoint-1", latLngA],
                ["waypoint-2", latLngB],
            ],
            {
                state: "selected",
                selectedNodeId: "waypoint-1",
            },
        );

        const next = editor.deleteAllWaypoint(state);

        expect(next.result).toBeUndefined();
        expect(next.state.nodes).toEqual([]);
        expect(next.state.status).toEqual({ state: "idle" });
    });

    it("빈 목록에서 전체 삭제하면 nodes는 빈 배열이고 상태는 idle이다", () => {
        const editor = createWaypointEditor({ createId: () => "unused" });
        const state = editor.createInitialState();

        const next = editor.deleteAllWaypoint(state);

        expect(next.result).toBeUndefined();
        expect(next.state.nodes).toEqual([]);
        expect(next.state.status).toEqual({ state: "idle" });
    });
});

function createStateWithWaypoints(
    waypoints: [string, LatLng][],
    status: WaypointEditorState["status"] = { state: "idle" },
): WaypointEditorState {
    return {
        nodes: waypoints.map(([id, latLng]) => ({
            id,
            latLng,
        })),
        status,
    };
}
