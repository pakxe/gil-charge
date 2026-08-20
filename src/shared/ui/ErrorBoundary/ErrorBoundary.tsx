import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/shared/components/Button/Button";

import type { ErrorBoundaryError } from "./useThrowToErrorBoundary";

type ErrorBoundaryProps = {
    children: ReactNode;
    fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type ErrorBoundaryState = {
    error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        error: null,
    };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.props.onError?.(error, errorInfo);
    }

    reset = () => {
        this.setState({
            error: null,
        });
    };

    render() {
        if (this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback({
                    error: this.state.error,
                    reset: this.reset,
                });
            }

            return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
        }

        return this.props.children;
    }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
    const errorBoundaryError = error as ErrorBoundaryError;
    const action = errorBoundaryError.errorBoundaryAction;

    function handleActionClick() {
        action?.onClick();
        reset();
    }

    return (
        <main className="flex min-h-dvh items-center justify-center bg-gil-bg px-5 text-gil-light-text">
            <section className="w-full max-w-sm rounded-lg border border-gil-gray-800 bg-gil-gray-900 p-6 shadow-2xl">
                <p className="typo-sub-semibold text-gil-primary">ERROR</p>
                <h1 className="typo-section-bold mt-2">문제가 발생했습니다</h1>
                <p className="typo-content-medium mt-3 leading-6 text-gil-gray-200">{error.message}</p>
                <div className="mt-6 flex justify-end gap-2">
                    {action && (
                        <Button size="sm" corner="semiRounded" onClick={handleActionClick}>
                            {action.label}
                        </Button>
                    )}
                    <Button size="sm" corner="semiRounded" onClick={reset}>
                        닫기
                    </Button>
                </div>
            </section>
        </main>
    );
}
