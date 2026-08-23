import type { AppError, AppErrorCode } from "@/shared/lib/appError";

export type ErrorFeedbackAction = {
    label: string;
    onClick: () => void;
};

export type ErrorFeedback =
    | {
          type: "silent";
      }
    | {
          type: "toast";
          message: string;
          action?: ErrorFeedbackAction;
      }
    | {
          type: "errorBoundary";
          error: AppError;
      };

const SILENT_ERROR_CODES = new Set<AppErrorCode>(["REQUEST_CANCELED"]);

const ERROR_BOUNDARY_ERROR_CODES = new Set<AppErrorCode>([
    "ROUTE_NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "CONFIGURATION_ERROR",
    "INTERNAL_SERVER_ERROR",
    "INVALID_RESPONSE",
]);

const DEFAULT_RETRYABLE_ERROR_CODES = new Set<AppErrorCode>([
    "OFFLINE",
    "NETWORK_ERROR",
    "TIMEOUT",
    "OPINET_UNAVAILABLE",
    "DATABASE_UNAVAILABLE",
]);

type DefaultErrorFeedbackOptions = {
    retry?: () => void;
};

export function getDefaultErrorFeedback(error: AppError, options: DefaultErrorFeedbackOptions = {}): ErrorFeedback {
    const feedback = getDefaultErrorFeedbackWithoutAction(error);

    if (feedback.type !== "toast" || !options.retry || !DEFAULT_RETRYABLE_ERROR_CODES.has(error.code)) {
        return feedback;
    }

    return {
        ...feedback,
        action: {
            label: "다시 시도",
            onClick: options.retry,
        },
    };
}

function getDefaultErrorFeedbackWithoutAction(error: AppError): ErrorFeedback {
    if (SILENT_ERROR_CODES.has(error.code)) {
        return {
            type: "silent",
        };
    }

    if (ERROR_BOUNDARY_ERROR_CODES.has(error.code)) {
        return {
            type: "errorBoundary",
            error,
        };
    }

    return {
        type: "toast",
        message: error.message,
    };
}
