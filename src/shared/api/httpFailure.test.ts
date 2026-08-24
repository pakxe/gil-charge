import { afterEach, describe, expect, it } from "vitest";
import { AxiosError, AxiosResponse } from "axios";

import { createHttpFailure, isHttpFailure, toHttpFailure } from "./httpFailure";

describe("createHttpFailure", () => {
    it("HttpFailure 이름과 reason을 가진 실패를 생성한다", () => {
        const httpFailure = createHttpFailure("TIMEOUT");

        expect(httpFailure).toBeInstanceOf(Error);
        expect(httpFailure.name).toBe("HttpFailure");
        expect(httpFailure.reason).toBe("TIMEOUT");
        expect(httpFailure.status).toBeUndefined();
        expect(httpFailure.data).toBeUndefined();
        expect(httpFailure.cause).toBeUndefined();
    });

    it("전달한 status, data, cause를 보존한다", () => {
        const cause = new Error("raw error");
        const data = {
            code: "INTERNAL_SERVER_ERROR",
        };

        const httpFailure = createHttpFailure("HTTP_ERROR", {
            status: 500,
            data,
            cause,
        });

        expect(httpFailure.status).toBe(500);
        expect(httpFailure.data).toBe(data);
        expect(httpFailure.cause).toBe(cause);
    });
});

describe("isHttpFailure", () => {
    it("HttpFailure 여부를 판별한다", () => {
        expect(isHttpFailure(createHttpFailure("NETWORK_ERROR"))).toBe(true);
        expect(isHttpFailure(new Error("network error"))).toBe(false);
        expect(isHttpFailure("network error")).toBe(false);
    });
});

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
                },
            },
        });

        const httpFailure = toHttpFailure(error);

        expect(httpFailure.reason).toBe("HTTP_ERROR");
        expect(httpFailure.status).toBe(400);
        expect(httpFailure.data).toEqual({
            code: "INVALID_INPUT",
        });
        expect(httpFailure.cause).toBe(error);
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

    it.each(["ECONNABORTED", "ETIMEDOUT"])("%s axios 실패를 TIMEOUT으로 변환한다", (code) => {
        const error = createAxiosError({
            code,
            request: {},
        });

        const httpFailure = toHttpFailure(error);

        expect(httpFailure.reason).toBe("TIMEOUT");
        expect(httpFailure.cause).toBe(error);
    });

    it("취소된 axios 요청을 REQUEST_CANCELED로 변환한다", () => {
        const error = createAxiosError({
            code: "ERR_CANCELED",
            request: {},
        });

        expect(toHttpFailure(error).reason).toBe("REQUEST_CANCELED");
    });

    it("CanceledError 이름을 가진 axios 실패를 REQUEST_CANCELED로 변환한다", () => {
        const error = createAxiosError({
            request: {},
        });
        Object.defineProperty(error, "name", {
            configurable: true,
            value: "CanceledError",
        });

        expect(toHttpFailure(error).reason).toBe("REQUEST_CANCELED");
    });

    it("응답 없는 axios 실패를 NETWORK_ERROR로 변환한다", () => {
        const error = createAxiosError({
            request: {},
        });

        const httpFailure = toHttpFailure(error);

        expect(httpFailure.reason).toBe("NETWORK_ERROR");
        expect(httpFailure.cause).toBe(error);
    });

    it("응답과 요청이 없는 axios 실패를 UNKNOWN_ERROR로 변환한다", () => {
        const error = createAxiosError({});

        const httpFailure = toHttpFailure(error);

        expect(httpFailure.reason).toBe("UNKNOWN_ERROR");
        expect(httpFailure.cause).toBe(error);
    });

    it("일반 unknown 값을 UNKNOWN_ERROR로 변환한다", () => {
        const httpFailure = toHttpFailure("boom");

        expect(isHttpFailure(httpFailure)).toBe(true);
        expect(httpFailure.reason).toBe("UNKNOWN_ERROR");
        expect(httpFailure.cause).toBe("boom");
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
