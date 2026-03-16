import { cn } from "@/shared/utils/cn";
import { cva, VariantProps } from "class-variance-authority";
import { ComponentPropsWithRef } from "react";
import { Outlet } from "react-router";

type Props = ComponentPropsWithRef<"div"> & VariantProps<typeof variants>;

export function MaxWidth({ maxWidth = "md", className, children, ...rest }: Props) {
    return (
        <div className={cn(variants({ maxWidth }), className)} {...rest}>
            {children || <Outlet />}
        </div>
    );
}

const variants = cva("flex px-4 mx-auto flex-1 flex-col w-full", {
    variants: {
        maxWidth: {
            xs: "max-w-xs",
            sm: "max-w-sm",
            md: "max-w-2xl",
            lg: "max-w-7xl",
        },
    },
});
