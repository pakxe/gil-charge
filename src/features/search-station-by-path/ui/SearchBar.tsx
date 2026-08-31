import { cn } from "@/shared/lib/cn";
import Box from "@/shared/ui/Box/Box";
import { InlineFailurePresentation } from "@/shared/ui/InlineFailurePresentation/InlineFailurePresentation";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner/LoadingSpinner";
import { Slider } from "@/shared/ui/Slider/Slider";
import { ChangeEvent } from "react";

type Props = {
    radiusKm: number;
    onRadiusChange: (radius: number) => void;

    onSearch: (radius: number) => void;
    searchState: "ready" | "disabled" | "loading";
    errorMessage: string | null;
    className?: string;
};

export function SearchBar({
    className,
    onRadiusChange,
    radiusKm,
    onSearch,
    errorMessage,
    searchState,
}: Props) {
    const handleRadiusChange = (event: ChangeEvent<HTMLInputElement>) => {
        onRadiusChange(Number(event.target.value));
    };

    return (
        <div
            className={cn("pointer-events-auto flex w-full flex-row justify-between gap-4 px-4", className)}
        >
            <Box className="h-fit min-w-0 flex-1 flex flex-col rounded-2xl gap-0">
                <Slider
                    id="radius-range"
                    min={1}
                    max={5}
                    step={0.1}
                    value={radiusKm}
                    onChange={handleRadiusChange}
                    topSlot={
                        <>
                            <label htmlFor="radius-range" className="text-white text-xs">
                                반경
                            </label>
                            <span className="font-bold text-gil-yellow-400 text-xs">{formatRadius(radiusKm)} km</span>
                        </>
                    }
                    bottomSlot={<InlineFailurePresentation message={errorMessage} />}
                />
            </Box>
            <button
                type="button"
                onClick={() => {
                    if (searchState !== "ready") {
                        return;
                    }

                    onSearch(radiusKm);
                }}
                disabled={searchState === "loading" || searchState === "disabled"}
                aria-label={searchState === "loading" ? "탐색 중" : "찾기"}
                className={cn(
                    "flex min-w-20 items-center justify-center rounded-2xl px-6 text-lg font-bold shadow-lg transition-colors",
                    searchState === "ready"
                        ? "bg-gil-yellow-400 text-gil-brown-900"
                        : "bg-gil-gray-850 text-gil-gray-600",
                )}
            >
                {searchState === "loading" ? <LoadingSpinner /> : "찾기"}
            </button>
        </div>
    );
}

function formatRadius(radiusKm: number) {
    return Number.isInteger(radiusKm) ? String(radiusKm) : radiusKm.toFixed(1);
}
