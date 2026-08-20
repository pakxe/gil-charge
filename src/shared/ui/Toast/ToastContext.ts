import { createContext } from "react";

export type ToastOptions = {
    message: string;
    durationMs?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
};

export type ToastContextValue = {
    showToast: (toast: ToastOptions) => void;
    closeToast: (id: number) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
