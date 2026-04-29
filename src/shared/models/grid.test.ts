import { describe, expect, it } from "vitest";

import { grid } from "./grid";

type TestItem = {
    id: string;
    point: {
        x: number;
        y: number;
    };
    data: string;
};

function ids(items: TestItem[]): string[] {
    return items.map((item) => item.id);
}

describe("grid", () => {
    it("items를 cellSize 기준으로 cell에 저장한다", () => {
        const items: TestItem[] = [
            { id: "a", point: { x: 0, y: 0 }, data: "A" },
            { id: "b", point: { x: 9, y: 9 }, data: "B" },
            { id: "c", point: { x: 10, y: 0 }, data: "C" },
        ];

        const state = grid.create(items, 10);

        expect(state.cellSize).toBe(10);
        expect(state.cells.get("0:0")).toEqual([items[0], items[1]]);
        expect(state.cells.get("1:0")).toEqual([items[2]]);
    });

    it("bounds 안에 있는 item만 반환한다", () => {
        const state = grid.create(
            [
                { id: "inside", point: { x: 5, y: 5 }, data: "inside" },
                { id: "outside-x", point: { x: 16, y: 5 }, data: "outside-x" },
                { id: "outside-y", point: { x: 5, y: 16 }, data: "outside-y" },
            ],
            10,
        );

        const result = grid.getItemsInBounds(state, {
            minX: 0,
            minY: 0,
            maxX: 10,
            maxY: 10,
        });

        expect(ids(result)).toEqual(["inside"]);
    });

    it("여러 cell에 걸친 bounds에서 item을 조회한다", () => {
        const state = grid.create(
            [
                { id: "top-left", point: { x: 5, y: 5 }, data: "top-left" },
                { id: "top-right", point: { x: 15, y: 5 }, data: "top-right" },
                { id: "bottom-left", point: { x: 5, y: 15 }, data: "bottom-left" },
                { id: "bottom-right", point: { x: 15, y: 15 }, data: "bottom-right" },
                { id: "outside", point: { x: 25, y: 25 }, data: "outside" },
            ],
            10,
        );

        const result = grid.getItemsInBounds(state, {
            minX: 0,
            minY: 0,
            maxX: 20,
            maxY: 20,
        });

        expect(ids(result)).toEqual(["top-left", "top-right", "bottom-left", "bottom-right"]);
    });

    it("bounds의 최소/최대 경계에 있는 item도 포함한다", () => {
        const state = grid.create(
            [
                { id: "min", point: { x: 10, y: 20 }, data: "min" },
                { id: "max", point: { x: 30, y: 40 }, data: "max" },
                { id: "before-min", point: { x: 9, y: 20 }, data: "before-min" },
                { id: "after-max", point: { x: 31, y: 40 }, data: "after-max" },
            ],
            10,
        );

        const result = grid.getItemsInBounds(state, {
            minX: 10,
            minY: 20,
            maxX: 30,
            maxY: 40,
        });

        expect(ids(result)).toEqual(["min", "max"]);
    });

    it("create 이후 add한 item도 조회할 수 있다", () => {
        const state = grid.create<TestItem>([], 10);
        const item = { id: "added", point: { x: 12, y: 13 }, data: "added" };

        grid.add(state, item);

        const result = grid.getItemsInBounds(state, {
            minX: 10,
            minY: 10,
            maxX: 20,
            maxY: 20,
        });

        expect(result).toEqual([item]);
    });

    it("음수 좌표도 cellSize 기준으로 조회한다", () => {
        const state = grid.create(
            [
                { id: "negative", point: { x: -1, y: -1 }, data: "negative" },
                { id: "positive", point: { x: 1, y: 1 }, data: "positive" },
            ],
            10,
        );

        const result = grid.getItemsInBounds(state, {
            minX: -5,
            minY: -5,
            maxX: 0,
            maxY: 0,
        });

        expect(ids(result)).toEqual(["negative"]);
    });

    it("bounds 안에 item이 없으면 빈 배열을 반환한다", () => {
        const state = grid.create([{ id: "outside", point: { x: 100, y: 100 }, data: "outside" }], 10);

        const result = grid.getItemsInBounds(state, {
            minX: 0,
            minY: 0,
            maxX: 10,
            maxY: 10,
        });

        expect(result).toEqual([]);
    });
});
