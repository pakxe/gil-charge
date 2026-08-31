import { WaypointHistoryControls } from "@/features/waypoint_editor/ui/WaypointHistoryControls";
import type { WaypointEditorMode } from "@/features/waypoint_editor/model/waypointEditor";
import { cn } from "@/shared/lib/cn";
import Box from "@/shared/ui/Box/Box";

type WaypointToolBarProps = {
    mode: WaypointEditorMode;
    hasWaypoints: boolean;
    onModeChange: (mode: WaypointEditorMode) => void;
    onDeleteAll: () => void;

    history: {
        canUndo: boolean;
        canRedo: boolean;
        onUndo: () => void;
        onRedo: () => void;
    };

    selection: {
        hasSelectedWaypoints: boolean;
        onDeleteSelected: () => void;
    };
};

export function WaypointToolBar({
    mode,
    hasWaypoints,
    onModeChange,
    onDeleteAll,
    history,
    selection,
}: WaypointToolBarProps) {
    return (
        <div className="absolute left-4 top-4 z-60 text-sm font-medium transition-colors flex flex-row gap-2 h-9">
            <WaypointHistoryControls
                canUndo={history.canUndo}
                canRedo={history.canRedo}
                onUndo={history.onUndo}
                onRedo={history.onRedo}
            />

            <Box role="group" aria-label="경로 편집 모드" yPad={4} xPad={4} className="gap-1">
                <button
                    type="button"
                    aria-pressed={mode === "waypoint"}
                    className={cn(
                        "h-8 rounded-full px-3 text-xs font-bold transition-colors shrink-0",
                        mode === "waypoint"
                            ? "bg-gil-yellow-400 text-gil-brown-900"
                            : "bg-transparent text-gil-light-text",
                    )}
                    onClick={() => onModeChange("waypoint")}
                >
                    추가
                </button>
                <button
                    type="button"
                    aria-pressed={mode === "lasso"}
                    className={cn(
                        "h-8 rounded-full px-3 text-xs font-bold transition-colors shrink-0",
                        mode === "lasso"
                            ? "bg-gil-yellow-400 text-gil-brown-900"
                            : "bg-transparent text-gil-light-text",
                    )}
                    onClick={() => onModeChange("lasso")}
                >
                    선택
                </button>
            </Box>
            <button
                type="button"
                disabled={!selection.hasSelectedWaypoints}
                className={cn(
                    "min-h-10 rounded-full bg-[#1f1f1f]/40 px-3 backdrop-blur-[15px] transition-colors text-xs font-bold",
                    selection.hasSelectedWaypoints
                        ? "cursor-pointer text-white"
                        : "cursor-not-allowed text-gil-gray-650",
                )}
                onClick={selection.onDeleteSelected}
            >
                선택 삭제
            </button>
            <Box
                role="button"
                tabIndex={0}
                className={cn(
                    hasWaypoints ? "text-white cursor-pointer" : "text-gil-gray-650",
                    "text-xs px-3 font-bold",
                )}
                onClick={onDeleteAll}
            >
                전체 삭제
            </Box>
        </div>
    );
}
