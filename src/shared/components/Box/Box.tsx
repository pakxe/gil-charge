import { cn } from "@/shared/utils/cn";
import { cva, VariantProps } from "class-variance-authority";
import { ComponentPropsWithRef } from "react";

type Props = ComponentPropsWithRef<"div"> & VariantProps<typeof boxVariants> & {};

function Box_({
    variant = "default",
    corner = "lg",
    className,
    children,

    ...rest
}: Props) {
    return (
        <div className={cn(boxVariants({ variant, corner }), className)} {...rest}>
            {children}
        </div>
    );
}

const boxVariants = cva("flex flex-row items-center justify-between rounded-3xl text-gil-light-text p-4 gap-4", {
    variants: {
        variant: {
            default: "bg-gil-gray-850 border border-gil-gray-700",
        },
        corner: {
            sm: "rounded-lg",
            md: "rounded-2xl",
            lg: "rounded-3xl",
        },
    },
});

function BoxSide({ className, children, ...rest }: ComponentPropsWithRef<"div">) {
    return (
        <div className={cn("shrink-0", className)} {...rest}>
            {children}
        </div>
    );
}

function BoxContent({ className, children, ...rest }: ComponentPropsWithRef<"div">) {
    return (
        <div className={cn("flex-1 flex flex-col gap-2", className)} {...rest}>
            {children}
        </div>
    );
}

function BoxContentRow({ className, children, ...rest }: ComponentPropsWithRef<"div">) {
    return (
        <div className={cn("flex flex-row justify-between items-center", className)} {...rest}>
            {children}
        </div>
    );
}

const Box = Object.assign(Box_, {
    Left: BoxSide,
    Right: BoxSide,
    Content: BoxContent,
    ContentRow: BoxContentRow,
});

export default Box;
