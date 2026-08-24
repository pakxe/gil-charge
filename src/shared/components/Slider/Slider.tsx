import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type Props = Omit<ComponentPropsWithRef<"input">, "children" | "className" | "max" | "min" | "step" | "style" | "type" | "value"> & {
    value: number;
    min: number;
    max: number;
    step?: number;
    topSlot?: ReactNode;
    bottomSlot?: ReactNode;
    className?: string;
    inputClassName?: string;
    inputStyle?: CSSProperties;
};

export function Slider({
    value,
    min,
    max,
    step,
    topSlot,
    bottomSlot,
    className,
    inputClassName,
    inputStyle,
    ...rest
}: Props) {
    const progress = getProgressPercentage(value, min, max);

    return (
        <div className={cn("flex w-full flex-col gap-0", className)}>
            {topSlot && <div className="flex w-full flex-row justify-between">{topSlot}</div>}

            <div className="w-full">
                <input
                    {...rest}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    className={cn(
                        "mt-2 block h-4.5 w-full cursor-pointer appearance-none rounded-full bg-transparent bg-center bg-no-repeat focus:outline-none focus-visible:ring-2 focus-visible:ring-gil-yellow-400/70 [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-gil-yellow-400 [&::-moz-range-thumb]:h-4.5 [&::-moz-range-thumb]:w-4.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-gil-yellow-400 [&::-moz-range-thumb]:shadow-[inset_0_0_0_2px_#fff] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-black [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gil-yellow-400 [&::-webkit-slider-thumb]:shadow-[inset_0_0_0_2px_#fff]",
                        inputClassName,
                    )}
                    style={{
                        backgroundImage: `linear-gradient(to right, #f0c243 0%, #f0c243 ${progress}%, #000 ${progress}%, #000 100%)`,
                        backgroundSize: "100% 6px",
                        backgroundClip: "content-box",
                        ...inputStyle,
                    }}
                />
            </div>

            {bottomSlot}
        </div>
    );
}

function getProgressPercentage(value: number, min: number, max: number) {
    if (max <= min) return 0;

    return Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
}
