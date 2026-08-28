import type { ComponentPropsWithRef } from "react";

import { cn } from "@/shared/utils/cn";

type Props = Omit<ComponentPropsWithRef<"p">, "children"> & {
    message: string | null;
};

export function InlineFailurePresentation({ message, className, ...rest }: Props) {
    if (!message) return null;

    return (
        <p role="alert" className={cn("mt-2 text-xs font-bold text-red-200", className)} {...rest}>
            {message}
        </p>
    );
}
