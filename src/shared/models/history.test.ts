import { describe, expect, it } from "vitest";

import { history } from "./history";

describe("history", () => {
    it("초기 snapshot을 현재 값으로 가진 history를 생성한다", () => {
        const initial = { count: 0 };

        const state = history.create(initial);

        expect(history.getCurrent(state)).toBe(initial);
        expect(state.snapshots).toEqual([initial]);
        expect(state.index).toBe(0);
        expect(state.limit).toBe(30);
        expect(history.canUndo(state)).toBe(false);
        expect(history.canRedo(state)).toBe(false);
    });

    it("history limit은 1 이상이어야 한다", () => {
        expect(() => history.create("initial", 0)).toThrow("limit는 1 이하는 불가능합니다.");
    });

    it("commit하면 다음 snapshot이 현재 값이 된다", () => {
        const initial = "first";
        const next = "second";

        const state = history.commit(history.create(initial), next);

        expect(history.getCurrent(state)).toBe(next);
        expect(state.snapshots).toEqual([initial, next]);
        expect(state.index).toBe(1);
        expect(history.canUndo(state)).toBe(true);
        expect(history.canRedo(state)).toBe(false);
    });

    it("undo하면 이전 snapshot으로 돌아간다", () => {
        const state = history.commit(history.commit(history.create("first"), "second"), "third");

        const undone = history.undo(state);

        expect(history.getCurrent(undone)).toBe("second");
        expect(undone.index).toBe(1);
        expect(history.canUndo(undone)).toBe(true);
        expect(history.canRedo(undone)).toBe(true);
    });

    it("redo하면 undo하기 전 snapshot으로 다시 이동한다", () => {
        const state = history.commit(history.commit(history.create("first"), "second"), "third");
        const undone = history.undo(state);

        const redone = history.redo(undone);

        expect(history.getCurrent(redone)).toBe("third");
        expect(redone.index).toBe(2);
        expect(history.canUndo(redone)).toBe(true);
        expect(history.canRedo(redone)).toBe(false);
    });

    it("undo한 뒤 commit하면 redo 가능한 미래 snapshot을 제거한다", () => {
        const state = history.commit(history.commit(history.create("first"), "second"), "third");
        const undone = history.undo(state);

        const committed = history.commit(undone, "new third");

        expect(history.getCurrent(committed)).toBe("new third");
        expect(committed.snapshots).toEqual(["first", "second", "new third"]);
        expect(committed.index).toBe(2);
        expect(history.canRedo(committed)).toBe(false);
    });

    it("limit을 넘으면 가장 오래된 snapshot을 제거하고 최신 snapshot을 유지한다", () => {
        const first = history.create("first", 3);
        const second = history.commit(first, "second");
        const third = history.commit(second, "third");

        const fourth = history.commit(third, "fourth");

        expect(fourth.snapshots).toEqual(["second", "third", "fourth"]);
        expect(fourth.index).toBe(2);
        expect(history.getCurrent(fourth)).toBe("fourth");
        expect(history.canUndo(fourth)).toBe(true);
        expect(history.canRedo(fourth)).toBe(false);
    });

    it("더 이상 undo할 수 없으면 에러를 던진다", () => {
        const state = history.create("first");

        expect(history.canUndo(state)).toBe(false);
        expect(() => history.undo(state)).toThrow("더 이상 undo할 수 없습니다.");
    });

    it("더 이상 redo할 수 없으면 에러를 던진다", () => {
        const state = history.commit(history.create("first"), "second");

        expect(history.canRedo(state)).toBe(false);
        expect(() => history.redo(state)).toThrow("더 이상 redo할 수 없습니다.");
    });
});
