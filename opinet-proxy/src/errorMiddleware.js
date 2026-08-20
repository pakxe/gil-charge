const { createAppError, isAppError } = require("./errors");

const MYSQL_NETWORK_ERROR_CODES = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "PROTOCOL_CONNECTION_LOST",
]);

function methodNotAllowed(req, res, next) {
    next(createAppError("METHOD_NOT_ALLOWED"));
}

function routeNotFound(req, res, next) {
    next(createAppError("ROUTE_NOT_FOUND"));
}

function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        next(error);
        return;
    }

    const appError = normalizeError(error);

    if (appError.status >= 500) {
        console.error("API error:", {
            code: appError.code,
            status: appError.status,
            method: req.method,
            path: req.originalUrl,
            context: appError.context,
            cause: summarizeCause(appError.cause || error),
        });
    }

    res.status(appError.status).json({
        code: appError.code,
        message: appError.message,
    });
}

function normalizeError(error) {
    if (isAppError(error)) {
        return error;
    }

    if (isPayloadTooLargeError(error)) {
        return createAppError("PAYLOAD_TOO_LARGE", { cause: error });
    }

    if (isMalformedJsonError(error)) {
        return createAppError("MALFORMED_JSON", { cause: error });
    }

    if (isDatabaseError(error)) {
        return createAppError("DATABASE_UNAVAILABLE", { cause: error });
    }

    return createAppError("INTERNAL_SERVER_ERROR", { cause: error });
}

function isPayloadTooLargeError(error) {
    return error?.type === "entity.too.large" || error?.status === 413;
}

function isMalformedJsonError(error) {
    return error?.type === "entity.parse.failed" || (error instanceof SyntaxError && error?.status === 400);
}

function isDatabaseError(error) {
    if (!error || typeof error !== "object") {
        return false;
    }

    if (typeof error.code === "string" && (error.code.startsWith("ER_") || MYSQL_NETWORK_ERROR_CODES.has(error.code))) {
        return true;
    }

    return Boolean(error.sql || error.sqlMessage || error.errno);
}

function summarizeCause(cause) {
    if (!cause || typeof cause !== "object") {
        return cause;
    }

    return {
        name: cause.name,
        message: cause.message,
        code: cause.code,
        status: cause.status,
        type: cause.type,
    };
}

module.exports = {
    errorHandler,
    methodNotAllowed,
    normalizeError,
    routeNotFound,
};
