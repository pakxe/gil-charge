import axios, { AxiosError } from "axios";

export const BACKEND_APP_ERROR_CODES = [
    "INVALID_INPUT",
    "PAYLOAD_TOO_LARGE",
    "ROUTE_NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "OPINET_UNAVAILABLE",
    "DATABASE_UNAVAILABLE",
    "CONFIGURATION_ERROR",
    "INTERNAL_SERVER_ERROR",
] as const;

export const CLIENT_APP_ERROR_CODES = [
    "OFFLINE",
    "NETWORK_ERROR",
    "TIMEOUT",
    "REQUEST_CANCELED",
    "INVALID_RESPONSE",
    "UNKNOWN_ERROR",
] as const;

export type BackendAppErrorCode = (typeof BACKEND_APP_ERROR_CODES)[number];
export type ClientAppErrorCode = (typeof CLIENT_APP_ERROR_CODES)[number];
export type AppErrorCode = BackendAppErrorCode | ClientAppErrorCode;

type AppErrorOptions = {
    message?: string;
    status?: number;
    cause?: unknown;
};

export type BackendAppErrorResponse = {
    code: BackendAppErrorCode;
    message: string;
};

const APP_ERROR_MESSAGES: Record<AppErrorCode, string> = {
    INVALID_INPUT: "입력값이 올바르지 않습니다.",
    PAYLOAD_TOO_LARGE: "요청 데이터가 너무 큽니다.",
    ROUTE_NOT_FOUND: "요청한 API를 찾을 수 없습니다.",
    METHOD_NOT_ALLOWED: "지원하지 않는 HTTP 메서드입니다.",
    OPINET_UNAVAILABLE: "유가 정보를 가져올 수 없습니다.",
    DATABASE_UNAVAILABLE: "일시적으로 데이터를 처리할 수 없습니다.",
    CONFIGURATION_ERROR: "서버 설정 오류가 발생했습니다.",
    INTERNAL_SERVER_ERROR: "서버 내부 오류가 발생했습니다.",
    OFFLINE: "인터넷 연결을 확인해주세요.",
    NETWORK_ERROR: "네트워크 연결 중 오류가 발생했습니다.",
    TIMEOUT: "요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
    REQUEST_CANCELED: "요청이 취소되었습니다.",
    INVALID_RESPONSE: "서버 응답 형식이 올바르지 않습니다.",
    UNKNOWN_ERROR: "알 수 없는 오류가 발생했습니다.",
};

const BACKEND_APP_ERROR_CODE_SET = new Set<string>(BACKEND_APP_ERROR_CODES);

export class AppError extends Error {
    readonly code: AppErrorCode;
    readonly status?: number;

    constructor(code: AppErrorCode, options: AppErrorOptions = {}) {
        super(options.message ?? APP_ERROR_MESSAGES[code]);
        this.name = "AppError";
        this.code = code;

        if (options.status !== undefined) {
            this.status = options.status;
        }

        if (options.cause !== undefined) {
            this.cause = options.cause;
        }
    }
}

export function createAppError(code: AppErrorCode, options?: AppErrorOptions) {
    return new AppError(code, options);
}

export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
    if (isAppError(error)) {
        return error;
    }

    if (axios.isAxiosError(error)) {
        return axiosErrorToAppError(error);
    }

    return createAppError("UNKNOWN_ERROR", { cause: error });
}

export function isBackendAppErrorResponse(value: unknown): value is BackendAppErrorResponse {
    if (!isRecord(value)) {
        return false;
    }

    return isBackendAppErrorCode(value.code) && typeof value.message === "string";
}

function axiosErrorToAppError(error: AxiosError): AppError {
    if (isCanceledAxiosError(error)) {
        return createAppError("REQUEST_CANCELED", { cause: error });
    }

    if (error.response) {
        const status = error.response.status;

        if (isBackendAppErrorResponse(error.response.data)) {
            return createAppError(error.response.data.code, {
                message: error.response.data.message,
                status,
                cause: error,
            });
        }

        return createAppError("INVALID_RESPONSE", { status, cause: error });
    }

    if (isBrowserOffline()) {
        return createAppError("OFFLINE", { cause: error });
    }

    if (isTimeoutAxiosError(error)) {
        return createAppError("TIMEOUT", { cause: error });
    }

    if (error.request) {
        return createAppError("NETWORK_ERROR", { cause: error });
    }

    return createAppError("UNKNOWN_ERROR", { cause: error });
}

function isBackendAppErrorCode(value: unknown): value is BackendAppErrorCode {
    return typeof value === "string" && BACKEND_APP_ERROR_CODE_SET.has(value);
}

function isCanceledAxiosError(error: AxiosError) {
    return axios.isCancel(error) || error.code === "ERR_CANCELED" || error.name === "CanceledError";
}

function isTimeoutAxiosError(error: AxiosError) {
    return error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
}

function isBrowserOffline() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
