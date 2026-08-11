import { cn } from "@/shared/utils/cn";

type Props = {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    className?: string;
};

export function WaypointHistoryControls({ canUndo, canRedo, onUndo, onRedo, className }: Props) {
    return (
        <div
            className={cn(
                "flex items-center gap-1 rounded-full bg-[#1f1f1f]/50 p-1 text-gil-light-text shadow-lg backdrop-blur-[15px]",
                className,
            )}
        >
            <button
                type="button"
                aria-label="웨이포인트 실행 취소"
                title="실행 취소"
                disabled={!canUndo}
                className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-lg font-black transition-colors disabled:cursor-not-allowed",
                    canUndo ? "bg-gil-yellow-400 text-gil-brown-900" : "bg-gil-gray-850 text-gil-gray-600",
                )}
                onClick={onUndo}
            >
                ↶
            </button>
            <button
                type="button"
                aria-label="웨이포인트 다시 실행"
                title="다시 실행"
                disabled={!canRedo}
                className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-lg font-black transition-colors disabled:cursor-not-allowed",
                    canRedo ? "bg-gil-yellow-400 text-gil-brown-900" : "bg-gil-gray-850 text-gil-gray-600",
                )}
                onClick={onRedo}
            >
                ↷
            </button>
        </div>
    );
}
