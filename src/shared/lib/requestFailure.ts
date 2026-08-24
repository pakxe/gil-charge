export const CLIENT_REQUEST_FAILURE_CODES = [
    "OFFLINE",
    "NETWORK_ERROR",
    "TIMEOUT",
    "REQUEST_CANCELED",
    "INVALID_RESPONSE",
    "UNKNOWN_ERROR",
] as const;

export type ClientRequestFailureCode = (typeof CLIENT_REQUEST_FAILURE_CODES)[number];

type RequestFailureOptions = {
    message?: string;
    status?: number;
    cause?: unknown;
};

const CLIENT_REQUEST_FAILURE_MESSAGES: Record<ClientRequestFailureCode, string> = {
    OFFLINE: "인터넷 연결을 확인해주세요.",
    NETWORK_ERROR: "네트워크 연결 중 오류가 발생했습니다.",
    TIMEOUT: "요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
    REQUEST_CANCELED: "요청이 취소되었습니다.",
    INVALID_RESPONSE: "서버 응답 형식이 올바르지 않습니다.",
    UNKNOWN_ERROR: "알 수 없는 오류가 발생했습니다.",
};

const CLIENT_REQUEST_FAILURE_CODE_SET = new Set<string>(CLIENT_REQUEST_FAILURE_CODES);

export class RequestFailure<TCode extends string = string> extends Error {
    readonly code: TCode;
    readonly status?: number;

    constructor(code: TCode, options: RequestFailureOptions = {}) {
        super(options.message ?? getDefaultRequestFailureMessage(code));
        this.name = "RequestFailure";
        this.code = code;

        if (options.status !== undefined) {
            this.status = options.status;
        }

        if (options.cause !== undefined) {
            this.cause = options.cause;
        }
    }
}

export function createRequestFailure(
    code: ClientRequestFailureCode,
    options?: RequestFailureOptions,
): RequestFailure<ClientRequestFailureCode>;
export function createRequestFailure<TCode extends string>(
    code: TCode,
    options: RequestFailureOptions & { message: string },
): RequestFailure<TCode>;
export function createRequestFailure<TCode extends string>(code: TCode, options?: RequestFailureOptions) {
    return new RequestFailure(code, options);
}

export function isRequestFailure(error: unknown): error is RequestFailure {
    return error instanceof RequestFailure;
}

export function toRequestFailure(error: unknown): RequestFailure {
    if (isRequestFailure(error)) {
        return error;
    }

    return createRequestFailure("UNKNOWN_ERROR", { cause: error });
}

function getDefaultRequestFailureMessage(code: string) {
    if (isClientRequestFailureCode(code)) {
        return CLIENT_REQUEST_FAILURE_MESSAGES[code];
    }

    return CLIENT_REQUEST_FAILURE_MESSAGES.UNKNOWN_ERROR;
}

function isClientRequestFailureCode(value: unknown): value is ClientRequestFailureCode {
    return typeof value === "string" && CLIENT_REQUEST_FAILURE_CODE_SET.has(value);
}
