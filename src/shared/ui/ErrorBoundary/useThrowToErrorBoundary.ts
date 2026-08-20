import { useState } from "react";

import type { ErrorFeedbackAction } from "@/shared/lib/errorFeedback";

export type ErrorBoundaryError = Error & {
    errorBoundaryAction?: ErrorFeedbackAction;
};

export function useThrowToErrorBoundary() {
    const [error, setError] = useState<ErrorBoundaryError | null>(null);

    if (error) {
        throw error;
    }

    function throwToErrorBoundary(nextError: Error, action?: ErrorFeedbackAction) {
        const errorWithAction = nextError as ErrorBoundaryError;
        errorWithAction.errorBoundaryAction = action;
        setError(errorWithAction);
    }

    return throwToErrorBoundary;
}
