import { describe, expect, it } from "vitest";
import {
    DEFAULT_WAYPOINT_HISTORY_LIMIT,
    waypointHistory,
} from "@/features/waypoint_editor/model/waypointHistory";
import type { WaypointNode } from "@/features/waypoint_editor/model/waypointEditor";

const waypointA = createWaypoint("waypoint-1", 37.5665, 126.978);
const waypointB = createWaypoint("waypoint-2", 35.1796, 129.0756);
const waypointC = createWaypoint("waypoint-3", 37.4563, 126.7052);

describe("waypointHistory", () => {
    it("초기 snapshot을 현재 값으로 가진 history를 생성한다", () => {
        const state = waypointHistory.create([waypointA]);

        expect(state.undoStack).toEqual([]);
        expect(waypointHistory.getCurrent(state)).toEqual([waypointA]);
        expect(state.redoStack).toEqual([]);
        expect(state.limit).toBe(DEFAULT_WAYPOINT_HISTORY_LIMIT);
        expect(waypointHistory.canUndo(state)).toBe(false);
        expect(waypointHistory.canRedo(state)).toBe(false);
    });

    it("history limit은 1 이상이어야 한다", () => {
        expect(() => waypointHistory.create([], 0)).toThrow("waypoint history limit은 1 이상이어야 합니다.");
    });

    it("commit하면 현재 snapshot을 undoStack에 쌓고 next를 현재 값으로 만든다", () => {
        const state = waypointHistory.commit(waypointHistory.create([waypointA]), [waypointA, waypointB]);

        expect(state.undoStack).toEqual([[waypointA]]);
        expect(waypointHistory.getCurrent(state)).toEqual([waypointA, waypointB]);
        expect(state.redoStack).toEqual([]);
        expect(waypointHistory.canUndo(state)).toBe(true);
        expect(waypointHistory.canRedo(state)).toBe(false);
    });

    it("undo하면 이전 snapshot으로 돌아가고 현재 snapshot을 redoStack에 쌓는다", () => {
        const state = waypointHistory.commit(
            waypointHistory.commit(waypointHistory.create([waypointA]), [waypointA, waypointB]),
            [waypointA, waypointB, waypointC],
        );

        const undone = waypointHistory.undo(state);

        expect(waypointHistory.getCurrent(undone)).toEqual([waypointA, waypointB]);
        expect(undone.undoStack).toEqual([[waypointA]]);
        expect(undone.redoStack).toEqual([[waypointA, waypointB, waypointC]]);
        expect(waypointHistory.canUndo(undone)).toBe(true);
        expect(waypointHistory.canRedo(undone)).toBe(true);
    });

    it("redo하면 redoStack의 snapshot을 현재 값으로 되돌린다", () => {
        const state = waypointHistory.commit(
            waypointHistory.commit(waypointHistory.create([waypointA]), [waypointA, waypointB]),
            [waypointA, waypointB, waypointC],
        );
        const undone = waypointHistory.undo(state);

        const redone = waypointHistory.redo(undone);

        expect(waypointHistory.getCurrent(redone)).toEqual([waypointA, waypointB, waypointC]);
        expect(redone.undoStack).toEqual([[waypointA], [waypointA, waypointB]]);
        expect(redone.redoStack).toEqual([]);
        expect(waypointHistory.canUndo(redone)).toBe(true);
        expect(waypointHistory.canRedo(redone)).toBe(false);
    });

    it("undo한 뒤 commit하면 redo 가능한 미래 snapshot을 제거한다", () => {
        const state = waypointHistory.commit(
            waypointHistory.commit(waypointHistory.create([waypointA]), [waypointA, waypointB]),
            [waypointA, waypointB, waypointC],
        );
        const undone = waypointHistory.undo(state);

        const committed = waypointHistory.commit(undone, [waypointA, waypointC]);

        expect(waypointHistory.getCurrent(committed)).toEqual([waypointA, waypointC]);
        expect(committed.undoStack).toEqual([[waypointA], [waypointA, waypointB]]);
        expect(committed.redoStack).toEqual([]);
        expect(waypointHistory.canRedo(committed)).toBe(false);
    });

    it("동일한 snapshot을 commit하면 history를 변경하지 않는다", () => {
        const state = waypointHistory.create([waypointA, waypointB]);

        const committed = waypointHistory.commit(state, [
            createWaypoint("waypoint-1", 37.5665, 126.978),
            createWaypoint("waypoint-2", 35.1796, 129.0756),
        ]);

        expect(committed).toBe(state);
    });

    it("undoStack은 limit까지만 유지한다", () => {
        const state = waypointHistory.commit(
            waypointHistory.commit(
                waypointHistory.commit(waypointHistory.create([], 2), [waypointA]),
                [waypointA, waypointB],
            ),
            [waypointA, waypointB, waypointC],
        );

        const firstUndo = waypointHistory.undo(state);
        const secondUndo = waypointHistory.undo(firstUndo);
        const thirdUndo = waypointHistory.undo(secondUndo);

        expect(waypointHistory.getCurrent(firstUndo)).toEqual([waypointA, waypointB]);
        expect(waypointHistory.getCurrent(secondUndo)).toEqual([waypointA]);
        expect(thirdUndo).toBe(secondUndo);
    });

    it("snapshot을 저장하거나 반환할 때 외부 변경에 영향을 받지 않도록 복사한다", () => {
        const initial = [createWaypoint("waypoint-1", 1, 1)];
        const state = waypointHistory.create(initial);

        initial[0] = createWaypoint("waypoint-1", 2, 2);
        expect(waypointHistory.getCurrent(state)).toEqual([createWaypoint("waypoint-1", 1, 1)]);

        const next = [createWaypoint("waypoint-2", 3, 3)];
        const committed = waypointHistory.commit(state, next);

        next[0] = createWaypoint("waypoint-2", 4, 4);
        expect(waypointHistory.getCurrent(committed)).toEqual([createWaypoint("waypoint-2", 3, 3)]);

        const current = waypointHistory.getCurrent(committed);
        const currentNode = current[0];
        if (!currentNode) {
            throw new Error("테스트 snapshot이 비어 있습니다.");
        }

        currentNode.latLng.lat = 100;
        expect(waypointHistory.getCurrent(committed)).toEqual([createWaypoint("waypoint-2", 3, 3)]);
    });
});

function createWaypoint(id: string, lat: number, lng: number): WaypointNode {
    return {
        id,
        latLng: {
            lat,
            lng,
        },
    };
}
