import { isHttpFailure } from "@/shared/api/httpFailure";
import { createRequestFailure, toRequestFailure } from "@/shared/lib/requestFailure";
import { z } from "zod";

export function toApiRequestFailure<Code extends string>(
    error: unknown,
    errorResponseSchema: z.ZodType<{
        code: Code;
        message: string;
    }>,
) {
    if (!isHttpFailure(error)) {
        return toRequestFailure(error);
    }

    switch (error.reason) {
        case "HTTP_ERROR": {
            const parsed = errorResponseSchema.safeParse(error.data);

            if (parsed.success) {
                return createRequestFailure(parsed.data.code, {
                    message: parsed.data.message,
                    status: error.status,
                    cause: error,
                });
            }

            return createRequestFailure("INVALID_RESPONSE", {
                status: error.status,
                cause: error,
            });
        }

        case "OFFLINE":
            return createRequestFailure("OFFLINE", { cause: error });

        case "NETWORK_ERROR":
            return createRequestFailure("NETWORK_ERROR", { cause: error });

        case "TIMEOUT":
            return createRequestFailure("TIMEOUT", { cause: error });

        case "REQUEST_CANCELED":
            return createRequestFailure("REQUEST_CANCELED", { cause: error });

        case "UNKNOWN_ERROR":
            return createRequestFailure("UNKNOWN_ERROR", { cause: error });
    }
}
