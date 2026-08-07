import { cn } from "@/shared/utils/cn";
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

type BoxPadding = number | string;

type Props = Omit<ComponentPropsWithRef<"div">, "children"> & {
    children: ReactNode;
    yPad?: BoxPadding;
    xPad?: BoxPadding;
    isRound?: boolean;
    isCircle?: boolean;
};

function Box_({
    children,
    yPad = 16,
    xPad = 16,
    isRound = true,
    isCircle = false,
    className,
    style,
    ...rest
}: Props) {
    return (
        <div
            className={cn(
                "flex flex-row items-center justify-between gap-4 bg-[#d9d9d9]/20 px-[var(--box-x-pad)] py-[var(--box-y-pad)] text-gil-light-text backdrop-blur-[15px]",
                isRound && !isCircle && "rounded-[50px]",
                isCircle && "aspect-square rounded-full",
                className,
            )}
            style={createBoxStyle({ xPad, yPad, style })}
            {...rest}
        >
            {children}
        </div>
    );
}

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

function createBoxStyle({
    xPad,
    yPad,
    style,
}: {
    xPad: BoxPadding;
    yPad: BoxPadding;
    style?: CSSProperties;
}): CSSProperties {
    return {
        "--box-x-pad": toCssLength(xPad),
        "--box-y-pad": toCssLength(yPad),
        ...style,
    } as CSSProperties;
}

function toCssLength(value: BoxPadding) {
    return typeof value === "number" ? `${value}px` : value;
}

const Box = Object.assign(Box_, {
    Left: BoxSide,
    Right: BoxSide,
    Content: BoxContent,
    ContentRow: BoxContentRow,
});

export default Box;
