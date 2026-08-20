import { ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { ToastContext, ToastContextValue, ToastOptions } from "./ToastContext";

const DEFAULT_TOAST_DURATION_MS = 3_500;

type ToastState = ToastOptions & {
    id: number;
    durationMs: number;
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastState[]>([]);
    const nextIdRef = useRef(1);

    const closeToast = useCallback((id: number) => {
        setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        ({ message, durationMs = DEFAULT_TOAST_DURATION_MS, action }: ToastOptions) => {
            const id = nextIdRef.current;
            nextIdRef.current += 1;

            setToasts((currentToasts) => [
                ...currentToasts,
                {
                    id,
                    message,
                    durationMs,
                    action,
                },
            ]);

            window.setTimeout(() => {
                closeToast(id);
            }, durationMs);
        },
        [closeToast],
    );

    const value = useMemo<ToastContextValue>(
        () => ({
            showToast,
            closeToast,
        }),
        [closeToast, showToast],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} onClose={closeToast} />
        </ToastContext.Provider>
    );
}

function ToastViewport({ toasts, onClose }: { toasts: ToastState[]; onClose: (id: number) => void }) {
    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-40 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 pb-[env(safe-area-inset-bottom)]">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onClose }: { toast: ToastState; onClose: (id: number) => void }) {
    function handleActionClick() {
        toast.action?.onClick();
        onClose(toast.id);
    }

    return (
        <div
            className="flex items-start justify-between gap-3 rounded-lg border border-gil-gray-800 bg-gil-gray-900 px-4 py-3 text-gil-light-text shadow-2xl"
            role="status"
        >
            <p className="typo-content-medium min-w-0 flex-1 leading-5">{toast.message}</p>
            {toast.action && (
                <button
                    className="typo-content-medium shrink-0 text-gil-primary"
                    type="button"
                    onClick={handleActionClick}
                >
                    {toast.action.label}
                </button>
            )}
            <button
                aria-label="알림 닫기"
                className="typo-content-medium shrink-0 text-gil-gray-500"
                type="button"
                onClick={() => onClose(toast.id)}
            >
                닫기
            </button>
        </div>
    );
}
