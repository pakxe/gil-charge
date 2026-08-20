import type { ErrorFeedback } from "@/shared/lib/errorFeedback";
import { useThrowToErrorBoundary } from "@/shared/ui/ErrorBoundary/useThrowToErrorBoundary";
import { useToast } from "@/shared/ui/Toast/useToast";

export function useErrorFeedback() {
    const { showToast } = useToast();
    const throwToErrorBoundary = useThrowToErrorBoundary();

    function handleFeedback(feedback: ErrorFeedback) {
        if (feedback.type === "silent") {
            return;
        }

        if (feedback.type === "errorBoundary") {
            throwToErrorBoundary(feedback.error, feedback.action);
            return;
        }

        showToast({
            message: feedback.message,
            action: feedback.action,
        });
    }

    return { handleFeedback };
}
