const ERROR_DEFINITIONS = Object.freeze({
    INVALID_INPUT: {
        status: 400,
        message: "입력값이 올바르지 않습니다.",
    },
    PAYLOAD_TOO_LARGE: {
        status: 413,
        message: "요청 데이터가 너무 큽니다.",
    },
    ROUTE_NOT_FOUND: {
        status: 404,
        message: "요청한 API를 찾을 수 없습니다.",
    },
    METHOD_NOT_ALLOWED: {
        status: 405,
        message: "지원하지 않는 HTTP 메서드입니다.",
    },
    OPINET_UNAVAILABLE: {
        status: 502,
        message: "유가 정보를 가져올 수 없습니다.",
    },
    CONFIGURATION_ERROR: {
        status: 500,
        message: "서버 설정 오류가 발생했습니다.",
    },
    INTERNAL_SERVER_ERROR: {
        status: 500,
        message: "서버 내부 오류가 발생했습니다.",
    },
});

class AppError extends Error {
    constructor(code, { cause, context } = {}) {
        const definition = ERROR_DEFINITIONS[code];

        if (!definition) {
            throw new Error(`Unknown error code: ${code}`);
        }

        super(definition.message);
        this.name = "AppError";
        this.code = code;
        this.status = definition.status;
        this.context = context;

        if (cause) {
            this.cause = cause;
        }

        Error.captureStackTrace?.(this, AppError);
    }
}

function createAppError(code, options) {
    return new AppError(code, options);
}

function isAppError(error) {
    return error instanceof AppError;
}

module.exports = {
    ERROR_DEFINITIONS,
    AppError,
    createAppError,
    isAppError,
};
