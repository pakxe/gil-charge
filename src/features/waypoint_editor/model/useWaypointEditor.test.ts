// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWaypointEditor } from "@/features/waypoint_editor/model/useWaypointEditor";

describe("useWaypointEditor", () => {
    it("복원된 웨이포인트를 undo 기준점으로 사용한다", () => {
        const { result } = renderHook(() =>
            useWaypointEditor({
                createId: () => "restored-waypoint",
                initialWaypoints: [{ lat: 37.5665, lng: 126.978 }],
            }),
        );

        expect(result.current.data.waypoints).toHaveLength(1);
        expect(result.current.data.canUndo).toBe(false);

        act(() => result.current.actions.deleteAllWaypoint());
        expect(result.current.data.canUndo).toBe(true);

        act(() => result.current.actions.undoWaypoint());
        expect(result.current.data.waypoints).toHaveLength(1);
    });

    it("웨이포인트 추가가 거부되면 onAddRejected를 호출한다", () => {
        const onAddRejected = vi.fn();
        const { result } = renderHook(() =>
            useWaypointEditor({
                createId: () => "waypoint-1",
                maxWaypointCount: 1,
                onAddRejected,
            }),
        );

        act(() => {
            result.current.actions.addWaypoint({ lat: 37.5665, lng: 126.978 });
        });

        expect(onAddRejected).not.toHaveBeenCalled();

        act(() => {
            result.current.actions.addWaypoint({ lat: 35.1796, lng: 129.0756 });
        });

        expect(onAddRejected).toHaveBeenCalledTimes(1);
        expect(onAddRejected).toHaveBeenCalledWith("OVERFLOW");
        expect(result.current.data.waypoints).toHaveLength(1);
    });

    it("사용자 편집이 확정되면 onWaypointsCommit을 호출한다", () => {
        const onWaypointsCommit = vi.fn();
        const { result } = renderHook(() =>
            useWaypointEditor({
                createId: () => "waypoint-1",
                onWaypointsCommit,
            }),
        );

        act(() => result.current.actions.addWaypoint({ lat: 37.5665, lng: 126.978 }));

        expect(onWaypointsCommit).toHaveBeenCalledWith([{ lat: 37.5665, lng: 126.978 }]);
    });

    it("외부 웨이포인트 복원은 onWaypointsCommit을 호출하지 않는다", () => {
        const onWaypointsCommit = vi.fn();
        const { result } = renderHook(() => useWaypointEditor({ onWaypointsCommit }));

        act(() => result.current.actions.restoreWaypoints([{ lat: 37.5665, lng: 126.978 }]));

        expect(onWaypointsCommit).not.toHaveBeenCalled();
    });

    it("삭제·undo·redo·전체 삭제가 확정될 때마다 onWaypointsCommit을 호출한다", () => {
        const onWaypointsCommit = vi.fn();
        let id = 0;
        const { result } = renderHook(() =>
            useWaypointEditor({
                createId: () => `waypoint-${++id}`,
                initialWaypoints: [
                    { lat: 10, lng: 20 },
                    { lat: 11, lng: 21 },
                ],
                onWaypointsCommit,
            }),
        );

        act(() => result.current.actions.deleteWaypoint("waypoint-1"));
        expect(onWaypointsCommit).toHaveBeenLastCalledWith([{ lat: 11, lng: 21 }]);

        act(() => result.current.actions.undoWaypoint());
        expect(onWaypointsCommit).toHaveBeenLastCalledWith([
            { lat: 10, lng: 20 },
            { lat: 11, lng: 21 },
        ]);

        act(() => result.current.actions.redoWaypoint());
        expect(onWaypointsCommit).toHaveBeenLastCalledWith([{ lat: 11, lng: 21 }]);

        act(() => result.current.actions.deleteAllWaypoint());
        expect(onWaypointsCommit).toHaveBeenLastCalledWith([]);
        expect(onWaypointsCommit).toHaveBeenCalledTimes(4);
    });

    it("다중 삭제가 확정되면 남은 웨이포인트로 onWaypointsCommit을 호출한다", () => {
        const onWaypointsCommit = vi.fn();
        let id = 0;
        const { result } = renderHook(() =>
            useWaypointEditor({
                createId: () => `waypoint-${++id}`,
                initialWaypoints: [
                    { lat: 37.1, lng: 127.1 },
                    { lat: 37.2, lng: 127.2 },
                    { lat: 37.3, lng: 127.3 },
                ],
                onWaypointsCommit,
            }),
        );

        act(() => result.current.actions.deleteBatchWaypoint(["waypoint-1", "waypoint-2"]));

        expect(onWaypointsCommit).toHaveBeenCalledWith([{ lat: 37.3, lng: 127.3 }]);
    });

    it("단일·다중 이동은 commit 전에는 알리지 않고 commit 후에만 알린다", () => {
        const onWaypointsCommit = vi.fn();
        let id = 0;
        const { result } = renderHook(() =>
            useWaypointEditor({
                createId: () => `waypoint-${++id}`,
                initialWaypoints: [
                    { lat: 10, lng: 20 },
                    { lat: 11, lng: 21 },
                ],
                onWaypointsCommit,
            }),
        );

        act(() => {
            result.current.actions.beginWaypointMove("waypoint-1", { lat: 10, lng: 20 });
            result.current.actions.updateWaypointMove("waypoint-1", { lat: 12, lng: 22 });
        });
        expect(onWaypointsCommit).not.toHaveBeenCalled();

        act(() => result.current.actions.commitWaypointMove());
        expect(onWaypointsCommit).toHaveBeenLastCalledWith([
            { lat: 12, lng: 22 },
            { lat: 11, lng: 21 },
        ]);

        act(() => {
            result.current.actions.beginBatchMove(["waypoint-1", "waypoint-2"], { lat: 12, lng: 22 });
            result.current.actions.updateBatchMove({ lat: 13, lng: 23 });
        });
        expect(onWaypointsCommit).toHaveBeenCalledTimes(1);

        act(() => result.current.actions.commitBatchMove());
        expect(onWaypointsCommit).toHaveBeenLastCalledWith([
            { lat: 13, lng: 23 },
            { lat: 12, lng: 22 },
        ]);
        expect(onWaypointsCommit).toHaveBeenCalledTimes(2);
    });

    it("선택과 실패한 명령은 onWaypointsCommit을 호출하지 않는다", () => {
        const onWaypointsCommit = vi.fn();
        const { result } = renderHook(() =>
            useWaypointEditor({
                createId: () => "waypoint-1",
                initialWaypoints: [{ lat: 37.1, lng: 127.1 }],
                maxWaypointCount: 1,
                onWaypointsCommit,
            }),
        );

        act(() => {
            result.current.actions.selectWaypoint("waypoint-1");
            result.current.actions.selectWaypoints(["waypoint-1"]);
            result.current.actions.deleteWaypoint("missing-waypoint");
            result.current.actions.addWaypoint({ lat: 37.2, lng: 127.2 });
            result.current.actions.commitWaypointMove();
        });

        expect(onWaypointsCommit).not.toHaveBeenCalled();
    });
});
