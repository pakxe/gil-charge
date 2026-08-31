// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWaypointEditor } from "@/features/waypoint_editor/model/useWaypointEditor";

describe("useWaypointEditor", () => {
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
});
