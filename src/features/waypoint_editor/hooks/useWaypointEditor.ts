import { useCallback, useMemo, useState } from "react";
import {
    type AddWaypointResult,
    type BeginWaypointMoveResult,
    type CommitWaypointMoveResult,
    type DeleteWaypointResult,
    type SelectWaypointResult,
    type SelectWaypointsResult,
    type WaypointEditorState,
    type WaypointNode,
    type WaypointNodeId,
    waypointEditor,
} from "@/features/waypoint_editor/model/waypointEditor";
import {
    type WaypointHistoryState,
    waypointHistory,
} from "@/features/waypoint_editor/model/waypointHistory";
import type { LatLng } from "@/shared/model/map";

type UseWaypointEditorOptions = {
    createId?: () => WaypointNodeId;
    maxWaypointCount?: number;
};

type WaypointEditorCommandResult =
    | AddWaypointResult
    | BeginWaypointMoveResult
    | CommitWaypointMoveResult
    | DeleteWaypointResult
    | SelectWaypointResult
    | SelectWaypointsResult;

type WaypointEditorHookState = {
    editorState: WaypointEditorState;
    historyState: WaypointHistoryState;
    result: WaypointEditorCommandResult | null;
};

const defaultCreateId = () => crypto.randomUUID();

export function useWaypointEditor({ createId = defaultCreateId, maxWaypointCount }: UseWaypointEditorOptions = {}) {
    const [hookState, setHookState] = useState<WaypointEditorHookState>(() => ({
        editorState: waypointEditor.createInitialState(),
        historyState: waypointHistory.create(),
        result: null,
    }));

    const addWaypoint = useCallback(
        (latLng: LatLng): void => {
            setHookState((prev) => {
                const next = waypointEditor.addWaypoint(prev.editorState, latLng, {
                    createId,
                    maxWaypointCount,
                });

                if (next.result.code !== 0) {
                    return {
                        ...prev,
                        editorState: next.state,
                        result: next.result,
                    };
                }

                const nextHistoryState = waypointHistory.commit(prev.historyState, next.state.nodes);

                return {
                    editorState: {
                        ...next.state,
                        nodes: waypointHistory.getCurrent(nextHistoryState),
                    },
                    historyState: nextHistoryState,
                    result: next.result,
                };
            });
        },
        [createId, maxWaypointCount],
    );

    const selectWaypoint = useCallback((id: WaypointNodeId): void => {
        setHookState((prev) => {
            const next = waypointEditor.selectWaypoint(prev.editorState, id);

            return {
                ...prev,
                editorState: next.state,
                result: next.result,
            };
        });
    }, []);

    const selectWaypoints = useCallback((ids: WaypointNodeId[]): void => {
        setHookState((prev) => {
            const next = waypointEditor.selectWaypoints(prev.editorState, ids);

            return {
                ...prev,
                editorState: next.state,
                result: next.result,
            };
        });
    }, []);

    const deleteWaypoint = useCallback((id: WaypointNodeId): void => {
        setHookState((prev) => {
            const next = waypointEditor.deleteWaypoint(prev.editorState, id);

            if (next.result.code !== 0) {
                return {
                    ...prev,
                    editorState: next.state,
                    result: next.result,
                };
            }

            const nextHistoryState = waypointHistory.commit(prev.historyState, next.state.nodes);

            return {
                editorState: {
                    ...next.state,
                    nodes: waypointHistory.getCurrent(nextHistoryState),
                },
                historyState: nextHistoryState,
                result: next.result,
            };
        });
    }, []);

    const deleteAllWaypoint = useCallback((): void => {
        setHookState((prev) => {
            const next = waypointEditor.deleteAllWaypoint(prev.editorState);
            const nextHistoryState = waypointHistory.commit(prev.historyState, next.state.nodes);

            return {
                editorState: {
                    ...next.state,
                    nodes: waypointHistory.getCurrent(nextHistoryState),
                },
                historyState: nextHistoryState,
                result: { code: 0 },
            };
        });
    }, []);

    const beginWaypointMove = useCallback((id: WaypointNodeId, latLng: LatLng): void => {
        setHookState((prev) => {
            const next = waypointEditor.beginWaypointMove(prev.editorState, id, latLng);

            return {
                ...prev,
                editorState: next.state,
                result: next.result,
            };
        });
    }, []);

    const updateWaypointMove = useCallback((id: WaypointNodeId, latLng: LatLng): void => {
        setHookState((prev) => ({
            ...prev,
            editorState: waypointEditor.updateWaypointMove(prev.editorState, id, latLng),
        }));
    }, []);

    const commitWaypointMove = useCallback((): void => {
        setHookState((prev) => {
            const next = waypointEditor.commitWaypointMove(prev.editorState);

            if (next.result.code !== 0) {
                return {
                    ...prev,
                    editorState: next.state,
                    result: next.result,
                };
            }

            const nextHistoryState = waypointHistory.commit(prev.historyState, next.state.nodes);

            return {
                editorState: {
                    ...next.state,
                    nodes: waypointHistory.getCurrent(nextHistoryState),
                },
                historyState: nextHistoryState,
                result: next.result,
            };
        });
    }, []);

    const undoWaypoint = useCallback((): void => {
        setHookState((prev) => {
            if (prev.editorState.status.statusName === "moving" || !waypointHistory.canUndo(prev.historyState)) {
                return prev;
            }

            const nextHistoryState = waypointHistory.undo(prev.historyState);

            return {
                editorState: waypointEditor.restoreNodes(
                    prev.editorState,
                    waypointHistory.getCurrent(nextHistoryState),
                ),
                historyState: nextHistoryState,
                result: null,
            };
        });
    }, []);

    const redoWaypoint = useCallback((): void => {
        setHookState((prev) => {
            if (prev.editorState.status.statusName === "moving" || !waypointHistory.canRedo(prev.historyState)) {
                return prev;
            }

            const nextHistoryState = waypointHistory.redo(prev.historyState);

            return {
                editorState: waypointEditor.restoreNodes(
                    prev.editorState,
                    waypointHistory.getCurrent(nextHistoryState),
                ),
                historyState: nextHistoryState,
                result: null,
            };
        });
    }, []);

    const editorState = hookState.editorState;
    const visibleWaypoints = useMemo(() => getVisibleWaypoints(editorState), [editorState]);
    const canUseHistory = editorState.status.statusName !== "moving";

    return {
        status: editorState.status,
        data: {
            waypoints: editorState.nodes,
            visibleWaypoints,
            canUndo: canUseHistory && waypointHistory.canUndo(hookState.historyState),
            canRedo: canUseHistory && waypointHistory.canRedo(hookState.historyState),
            result: hookState.result,
        },
        actions: {
            addWaypoint,
            selectWaypoint,
            selectWaypoints,
            deleteWaypoint,
            deleteAllWaypoint,
            beginWaypointMove,
            updateWaypointMove,
            commitWaypointMove,
            undoWaypoint,
            redoWaypoint,
        },
    };
}

function getVisibleWaypoints(state: WaypointEditorState): WaypointNode[] {
    if (state.status.statusName !== "moving") {
        return state.nodes;
    }

    const movingStatus = state.status;

    return state.nodes.map((node) =>
        node.id === movingStatus.movingNodeId
            ? {
                  ...node,
                  latLng: {
                      lat: movingStatus.latLng.lat,
                      lng: movingStatus.latLng.lng,
                  },
              }
            : node,
    );
}
