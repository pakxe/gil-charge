import { describe, expect, it } from "vitest";

import { BACKEND_APP_ERROR_CODES, CLIENT_APP_ERROR_CODES, createAppError } from "@/shared/lib/appError";

import { getDefaultErrorFeedback } from "./errorFeedback";

describe("getDefaultErrorFeedback", () => {
    it("요청 취소는 silent로 처리한다", () => {
        expect(getDefaultErrorFeedback(createAppError("REQUEST_CANCELED"))).toEqual({
            type: "silent",
        });
    });

    it("사용자가 직접 복구하기 어려운 앱/서버 계약 오류는 ErrorBoundary로 올린다", () => {
        const errorBoundaryCodes = [
            "ROUTE_NOT_FOUND",
            "METHOD_NOT_ALLOWED",
            "CONFIGURATION_ERROR",
            "INTERNAL_SERVER_ERROR",
            "INVALID_RESPONSE",
        ] as const;

        errorBoundaryCodes.forEach((code) => {
            const error = createAppError(code);

            expect(getDefaultErrorFeedback(error)).toEqual({
                type: "errorBoundary",
                error,
            });
        });
    });

    it("나머지 오류는 toast로 처리한다", () => {
        const toastCodes = [...BACKEND_APP_ERROR_CODES, ...CLIENT_APP_ERROR_CODES].filter(
            (code) =>
                ![
                    "REQUEST_CANCELED",
                    "ROUTE_NOT_FOUND",
                    "METHOD_NOT_ALLOWED",
                    "CONFIGURATION_ERROR",
                    "INTERNAL_SERVER_ERROR",
                    "INVALID_RESPONSE",
                ].includes(code),
        );

        toastCodes.forEach((code) => {
            expect(getDefaultErrorFeedback(createAppError(code))).toMatchObject({
                type: "toast",
            });
        });
    });

    it("기본 재시도 가능 오류에는 retry action을 추가한다", () => {
        const retry = () => {};

        expect(getDefaultErrorFeedback(createAppError("TIMEOUT"), { retry })).toMatchObject({
            type: "toast",
            action: {
                label: "다시 시도",
                onClick: retry,
            },
        });
    });

    it("OFFLINE에도 retry action을 추가한다", () => {
        const retry = () => {};

        expect(getDefaultErrorFeedback(createAppError("OFFLINE"), { retry })).toMatchObject({
            type: "toast",
            action: {
                label: "다시 시도",
                onClick: retry,
            },
        });
    });
});
