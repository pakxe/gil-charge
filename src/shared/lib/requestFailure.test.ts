import { describe, expect, it } from "vitest";

import { createRequestFailure, isRequestFailure, toRequestFailure } from "./requestFailure";

describe("toRequestFailure", () => {
    it("이미 RequestFailure이면 그대로 반환한다", () => {
        const requestFailure = createRequestFailure("TIMEOUT");

        expect(toRequestFailure(requestFailure)).toBe(requestFailure);
    });

    it("일반 unknown 값을 UNKNOWN_ERROR로 변환한다", () => {
        const requestFailure = toRequestFailure("boom");

        expect(isRequestFailure(requestFailure)).toBe(true);
        expect(requestFailure.code).toBe("UNKNOWN_ERROR");
    });
});
