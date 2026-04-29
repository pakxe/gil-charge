// useEditArea.reducer.test.ts
import { describe, expect, it } from "vitest";
import { createEditAreaInitialState, editAreaReducer, EditAreaState } from "./useEditArea";
import { LatLng } from "@/shared/types/map";
import { history } from "@/shared/models/history";

const latLngA: LatLng = {
    lat: 37.5665,
    lng: 126.978,
};

describe("editAreaReducer", () => {
    describe("selectMode", () => {
        it("모드 변경 시 draft/selection/history 상태를 초기화한다", () => {
            const prev: EditAreaState = {
                ...createEditAreaInitialState(),
                mode: "pen",
                selectedWaypointIndex: 1,
                penDrawModeDraft: [latLngA],
                penEraseModeDraft: [latLngA],
            };

            const next = editAreaReducer(prev, {
                type: "selectMode",
                next: "waypoint",
            });

            expect(next.mode).toBe("waypoint");
            expect(next.selectedWaypointIndex).toBeNull();
            expect(next.penDrawModeDraft).toEqual([]);
            expect(next.penEraseModeDraft).toEqual([]);
            expect(history.getCurrent(next.history).penPaths).toEqual([]);
            expect(history.getCurrent(next.history).waypoints).toEqual([]);
        });

        it("모드 변경 시 draft/selection/history 상태를 초기화한다", () => {
            const prev: EditAreaState = {
                ...createEditAreaInitialState(),
                mode: "waypoint",
                selectedWaypointIndex: 1,
                penDrawModeDraft: [latLngA],
                penEraseModeDraft: [latLngA],
            };

            const next = editAreaReducer(prev, {
                type: "selectMode",
                next: "pen",
            });

            expect(next.mode).toBe("pen");
            expect(next.selectedWaypointIndex).toBeNull();
            expect(next.penDrawModeDraft).toEqual([]);
            expect(next.penEraseModeDraft).toEqual([]);
            expect(history.getCurrent(next.history).penPaths).toEqual([]);
            expect(history.getCurrent(next.history).waypoints).toEqual([]);
        });
    });

    describe("click", () => {
        it("waypoint모드가 아닐 때 지도를 클릭해도 history가 추가되지 않는다", () => {});
        it("waypoint모드일 때 지도를 클릭하면 현재 history에 스냅샷이 추가된다.", () => {});
    });

    describe("dragStart", () => {
        it("dragStart는 pen 모드가 아니면 아무 것도 하지 않는다", () => {
            const prev = createEditAreaInitialState();

            const next = editAreaReducer(prev, {
                type: "dragStart",
                latLng: latLngA,
            });

            expect(next).toBe(prev);
            expect(next.isPenDrawing).toBe(false);
            expect(next.penDrawModeDraft).toEqual([]);
        });

        it("dragStart는 pen 모드에서 drawing을 시작하고 좌표를 draft에 추가한다", () => {
            const prev: EditAreaState = {
                ...createEditAreaInitialState(),
                mode: "pen",
            };

            const next = editAreaReducer(prev, {
                type: "dragStart",
                latLng: latLngA,
            });

            expect(next).not.toBe(prev);
            expect(next.isPenDrawing).toBe(true);
            expect(next.penDrawModeDraft).toEqual([latLngA]);

            // 원본 state가 변하지 않았는지도 같이 확인
            expect(prev.isPenDrawing).toBe(false);
            expect(prev.penDrawModeDraft).toEqual([]);
        });

        it("dragStart는 pen 모드에서 history에 스냅샷을 남기지는 않는다", () => {});
    });
});
