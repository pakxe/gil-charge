import { cn } from "@/shared/utils/cn";
import { cva, VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, ReactNode } from "react";

type Props = ComponentPropsWithRef<"button"> &
    VariantProps<typeof buttonVariants> & {
        leftSlot?: ReactNode;
        rightSlot?: ReactNode;
    };

export function Button({
    children,
    leftSlot,
    rightSlot,
    variant = "primary",
    size = "md",
    corner = "rounded",
    className,
    ...rest
}: Props) {
    return (
        <button className={cn(buttonVariants({ variant, size, corner }), className)} {...rest}>
            {leftSlot && leftSlot}
            {children}
            {rightSlot && rightSlot}
        </button>
    );
}

const buttonVariants = cva("flex flex-row gap-2 justify-center items-center shrink-0", {
    variants: {
        variant: {
            primary: "bg-gil-primary text-gil-dark-text",

            secondary: "bg-gil-primary/10 text-gil-primary",
            outlined: "text-gil-primary bg-gil-primary/10 border border-gil-brown-600",

            tertiary: "bg-gil-gray-850 text-gil-primary",
            disabled: "bg-gil-gray-850 text-gil-gray-700",
            normal: "bg-gil-gray-850 text-gil-light-text",

            // text
            textPrimary: "bg-transparent text-gil-primary",
            textNormal: "bg_transparent text-gil-light-text",
        },

        size: {
            xs: "h-6 px-2.5 typo-tiny-bold",
            sm: "h-7 px-4 typo-sub-semibold",
            md: "h-14 px-9 typo-body-bold",
        },

        corner: {
            rounded: "rounded-full",
            semiRounded: "rounded-lg",
        },
    },
});
