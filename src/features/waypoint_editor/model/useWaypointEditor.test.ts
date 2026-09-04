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
});
