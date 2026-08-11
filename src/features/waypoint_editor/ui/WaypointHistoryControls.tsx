import Box from "@/shared/components/Box/Box";
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
        <Box>
            <button
                type="button"
                aria-label="웨이포인트 실행 취소"
                title="실행 취소"
                disabled={!canUndo}
                className={cn(
                    "flex items-center justify-center rounded-full text-md transition-colors disabled:cursor-not-allowed px-2",
                    canUndo ? "text-gil-yellow-400" : "text-gil-gray-950",
                )}
                onClick={onUndo}
            >
                {"<"}
            </button>

            <button
                type="button"
                aria-label="웨이포인트 다시 실행"
                title="다시 실행"
                disabled={!canRedo}
                className={cn(
                    "flex items-center justify-center rounded-full text-md transition-colors disabled:cursor-not-allowed px-2",
                    canRedo ? "text-gil-yellow-400" : "text-gil-gray-950",
                )}
                onClick={onRedo}
            >
                {">"}
            </button>
        </Box>
    );
}
