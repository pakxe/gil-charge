import Box from "@/shared/ui/Box/Box";
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
        <Box className={cn(className, "px-2 font-extrabold")}>
            <button
                type="button"
                aria-label="웨이포인트 실행 취소"
                title="실행 취소"
                disabled={!canUndo}
                className={cn(
                    "flex items-center justify-center rounded-full text-md transition-colors disabled:cursor-not-allowed px-2",
                    canUndo ? "text-white" : "text-gil-gray-650",
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
                    canRedo ? "text-white" : "text-gil-gray-650",
                )}
                onClick={onRedo}
            >
                {">"}
            </button>
        </Box>
    );
}
