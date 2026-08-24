import axios, { AxiosError } from "axios";

export const HTTP_FAILURE_REASONS = [
    "HTTP_ERROR",
    "OFFLINE",
    "NETWORK_ERROR",
    "TIMEOUT",
    "REQUEST_CANCELED",
    "UNKNOWN_ERROR",
] as const;

export type HttpFailureReason = (typeof HTTP_FAILURE_REASONS)[number];

type HttpFailureOptions = {
    message?: string;
    status?: number;
    data?: unknown;
    cause?: unknown;
};

const HTTP_FAILURE_MESSAGES: Record<HttpFailureReason, string> = {
    HTTP_ERROR: "HTTP response error",
    OFFLINE: "Browser is offline",
    NETWORK_ERROR: "Network error",
    TIMEOUT: "HTTP request timeout",
    REQUEST_CANCELED: "HTTP request canceled",
    UNKNOWN_ERROR: "Unknown HTTP error",
};

export class HttpFailure extends Error {
    readonly reason: HttpFailureReason;
    readonly status?: number;
    readonly data?: unknown;

    constructor(reason: HttpFailureReason, options: HttpFailureOptions = {}) {
        super(options.message ?? HTTP_FAILURE_MESSAGES[reason]);
        this.name = "HttpFailure";
        this.reason = reason;

        if (options.status !== undefined) {
            this.status = options.status;
        }

        if (options.data !== undefined) {
            this.data = options.data;
        }

        if (options.cause !== undefined) {
            this.cause = options.cause;
        }
    }
}

export function createHttpFailure(reason: HttpFailureReason, options?: HttpFailureOptions) {
    return new HttpFailure(reason, options);
}

export function isHttpFailure(error: unknown): error is HttpFailure {
    return error instanceof HttpFailure;
}

export function toHttpFailure(error: unknown): HttpFailure {
    if (isHttpFailure(error)) {
        return error;
    }

    if (axios.isAxiosError(error)) {
        return axiosErrorToHttpFailure(error);
    }

    return createHttpFailure("UNKNOWN_ERROR", { cause: error });
}

function axiosErrorToHttpFailure(error: AxiosError): HttpFailure {
    if (isCanceledAxiosError(error)) {
        return createHttpFailure("REQUEST_CANCELED", { cause: error });
    }

    if (error.response) {
        return createHttpFailure("HTTP_ERROR", {
            status: error.response.status,
            data: error.response.data,
            cause: error,
        });
    }

    if (isBrowserOffline()) {
        return createHttpFailure("OFFLINE", { cause: error });
    }

    if (isTimeoutAxiosError(error)) {
        return createHttpFailure("TIMEOUT", { cause: error });
    }

    if (error.request) {
        return createHttpFailure("NETWORK_ERROR", { cause: error });
    }

    return createHttpFailure("UNKNOWN_ERROR", { cause: error });
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
