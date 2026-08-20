import { useState } from "react";

export function useThrowToErrorBoundary() {
    const [error, setError] = useState<Error | null>(null);

    if (error) {
        throw error;
    }

    function throwToErrorBoundary(nextError: Error) {
        setError(nextError);
    }

    return throwToErrorBoundary;
}
