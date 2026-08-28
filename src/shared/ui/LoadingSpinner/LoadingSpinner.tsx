import type { ComponentPropsWithRef } from "react";

import { cn } from "@/shared/lib/cn";

type Props = Omit<ComponentPropsWithRef<"span">, "children"> & {
    label?: string;
};

export function LoadingSpinner({ className, label = "로딩 중", ...rest }: Props) {
    return (
        <span
            role="status"
            aria-label={label}
            className={cn(
                "inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent",
                className,
            )}
            {...rest}
        />
    );
}
