import { describe, expect, it } from "vitest";

import { clamp, round } from "@/shared/lib/number";

describe("number", () => {
    it("값을 최솟값과 최댓값 사이로 제한한다", () => {
        expect(clamp(-1, 0, 10)).toBe(0);
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(11, 0, 10)).toBe(10);
    });

    it("지정한 소수점 자릿수로 반올림한다", () => {
        expect(round(1.005, 2)).toBe(1.01);
        expect(round(37.12345678, 6)).toBe(37.123457);
    });
});
