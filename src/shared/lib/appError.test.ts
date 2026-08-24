import { describe, expect, it, afterEach } from "vitest";
import { AxiosError, AxiosResponse } from "axios";

import { createAppError, isAppError, toAppError } from "./appError";

describe("toAppError", () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            value: originalNavigator,
        });
    });

    it("이미 AppError이면 그대로 반환한다", () => {
        const appError = createAppError("OPINET_UNAVAILABLE");

        expect(toAppError(appError)).toBe(appError);
    });

    it("백엔드 에러 응답의 code와 status를 보존한다", () => {
        const error = createAxiosError({
            response: {
                status: 400,
                data: {
                    code: "INVALID_FIELDS",
                    message: "필드 값이 올바르지 않습니다: radiusKm",
                },
            },
        });

        const appError = toAppError(error);

        expect(appError).toMatchObject({
            code: "INVALID_FIELDS",
            status: 400,
        });
    });

    it("알 수 없는 백엔드 응답 형식이면 INVALID_RESPONSE로 변환한다", () => {
        const error = createAxiosError({
            response: {
                status: 500,
                data: {
                    error: "Internal Server Error",
                },
            },
        });

        const appError = toAppError(error);

        expect(appError).toMatchObject({
            code: "INVALID_RESPONSE",
            status: 500,
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

        expect(toAppError(error).code).toBe("OFFLINE");
    });

    it("타임아웃 axios 실패를 TIMEOUT으로 변환한다", () => {
        const error = createAxiosError({
            code: "ECONNABORTED",
            request: {},
        });

        expect(toAppError(error).code).toBe("TIMEOUT");
    });

    it("취소된 axios 요청을 REQUEST_CANCELED로 변환한다", () => {
        const error = createAxiosError({
            code: "ERR_CANCELED",
            request: {},
        });

        expect(toAppError(error).code).toBe("REQUEST_CANCELED");
    });

    it("응답 없는 axios 실패를 NETWORK_ERROR로 변환한다", () => {
        const error = createAxiosError({
            request: {},
        });

        expect(toAppError(error).code).toBe("NETWORK_ERROR");
    });

    it("일반 unknown 값을 UNKNOWN_ERROR로 변환한다", () => {
        const appError = toAppError("boom");

        expect(isAppError(appError)).toBe(true);
        expect(appError.code).toBe("UNKNOWN_ERROR");
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
