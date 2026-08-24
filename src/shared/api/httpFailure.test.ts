import { afterEach, describe, expect, it } from "vitest";
import { AxiosError, AxiosResponse } from "axios";

import { createHttpFailure, isHttpFailure, toHttpFailure } from "./httpFailure";

describe("toHttpFailure", () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            value: originalNavigator,
        });
    });

    it("이미 HttpFailure이면 그대로 반환한다", () => {
        const httpFailure = createHttpFailure("TIMEOUT");

        expect(toHttpFailure(httpFailure)).toBe(httpFailure);
    });

    it("응답이 있는 axios 실패를 HTTP_ERROR로 변환하고 status와 data를 보존한다", () => {
        const error = createAxiosError({
            response: {
                status: 400,
                data: {
                    code: "INVALID_INPUT",
                    message: "입력값이 올바르지 않습니다.",
                },
            },
        });

        const httpFailure = toHttpFailure(error);

        expect(httpFailure).toMatchObject({
            reason: "HTTP_ERROR",
            status: 400,
            data: {
                code: "INVALID_INPUT",
                message: "입력값이 올바르지 않습니다.",
            },
        });
    });

    it("오프라인 상태의 axios 실패를 OFFLINE으로 변환한다", () => {
        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            value: { onLine: false },
        });

        const error = createAxiosError({
            request: {},
        });

        expect(toHttpFailure(error).reason).toBe("OFFLINE");
    });

    it("타임아웃 axios 실패를 TIMEOUT으로 변환한다", () => {
        const error = createAxiosError({
            code: "ECONNABORTED",
            request: {},
        });

        expect(toHttpFailure(error).reason).toBe("TIMEOUT");
    });

    it("취소된 axios 요청을 REQUEST_CANCELED로 변환한다", () => {
        const error = createAxiosError({
            code: "ERR_CANCELED",
            request: {},
        });

        expect(toHttpFailure(error).reason).toBe("REQUEST_CANCELED");
    });

    it("응답 없는 axios 실패를 NETWORK_ERROR로 변환한다", () => {
        const error = createAxiosError({
            request: {},
        });

        expect(toHttpFailure(error).reason).toBe("NETWORK_ERROR");
    });

    it("일반 unknown 값을 UNKNOWN_ERROR로 변환한다", () => {
        const httpFailure = toHttpFailure("boom");

        expect(isHttpFailure(httpFailure)).toBe(true);
        expect(httpFailure.reason).toBe("UNKNOWN_ERROR");
    });
});

function createAxiosError({
    code,
    request,
    response,
}: {
    code?: string;
    request?: unknown;
    response?: Pick<AxiosResponse, "status" | "data">;
}) {
    const axiosResponse = response
        ? ({
              status: response.status,
              data: response.data,
          } as AxiosResponse)
        : undefined;

    return new AxiosError("axios error", code, undefined, request, axiosResponse);
}
