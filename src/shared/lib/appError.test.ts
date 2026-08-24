import { describe, expect, it } from "vitest";

import { createAppError, isAppError, toAppError } from "./appError";

describe("toAppError", () => {
    it("이미 AppError이면 그대로 반환한다", () => {
        const appError = createAppError("OPINET_UNAVAILABLE");

        expect(toAppError(appError)).toBe(appError);
    });

    it("일반 unknown 값을 UNKNOWN_ERROR로 변환한다", () => {
        const appError = toAppError("boom");

        expect(isAppError(appError)).toBe(true);
        expect(appError.code).toBe("UNKNOWN_ERROR");
    });
});
