import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
    type AddWaypointResult,
    type BeginBatchMoveResult,
    type BeginWaypointMoveResult,
    type CommitBatchMoveResult,
    type CommitWaypointMoveResult,
    type DeleteBatchWaypointResult,
    type DeleteWaypointResult,
    type SelectWaypointResult,
    type SelectWaypointsResult,
    type WaypointEditorState,
    type WaypointNode,
    type WaypointNodeId,
    waypointEditor,
} from "@/features/waypoint_editor/model/waypointEditor";
import { type WaypointHistoryState, waypointHistory } from "@/features/waypoint_editor/model/waypointHistory";
import type { LatLng } from "@/shared/model/map";

type UseWaypointEditorOptions = {
    createId?: () => WaypointNodeId;
    initialWaypoints?: LatLng[];
    maxWaypointCount?: number;
    onAddRejected?: (reason: "OVERFLOW") => void;
    onWaypointsCommit?: (waypoints: LatLng[]) => void;
};

type WaypointEditorCommandResult =
    | AddWaypointResult
    | BeginBatchMoveResult
    | BeginWaypointMoveResult
    | CommitBatchMoveResult
    | CommitWaypointMoveResult
    | DeleteBatchWaypointResult
    | DeleteWaypointResult
    | SelectWaypointResult
    | SelectWaypointsResult;

type WaypointEditorHookState = {
    editorState: WaypointEditorState;
    historyState: WaypointHistoryState;
    result: WaypointEditorCommandResult | null;
    committedWaypoints: LatLng[] | null;
};

const defaultCreateId = () => uuidv4();

export function useWaypointEditor({
    createId = defaultCreateId,
    initialWaypoints = [],
    maxWaypointCount,
    onAddRejected,
    onWaypointsCommit,
}: UseWaypointEditorOptions = {}) {
    const onAddRejectedRef = useRef(onAddRejected);
    const onWaypointsCommitRef = useRef(onWaypointsCommit);
    const [hookState, setHookState] = useState<WaypointEditorHookState>(() => {
        const nodes = initialWaypoints.map((latLng) => ({ id: createId(), latLng: { ...latLng } }));
        return {
            editorState: waypointEditor.restoreNodes(waypointEditor.createInitialState(), nodes),
            historyState: waypointHistory.create(nodes),
            result: null,
            committedWaypoints: null,
        };
    });

    useEffect(() => {
        onAddRejectedRef.current = onAddRejected;
        onWaypointsCommitRef.current = onWaypointsCommit;
    }, [onAddRejected, onWaypointsCommit]);

    useEffect(() => {
        const result = hookState.result;

        if (!result || !("reason" in result) || result.reason !== "OVERFLOW") {
            return;
        }

        onAddRejectedRef.current?.(result.reason);
    }, [hookState.result]);

    useEffect(() => {
        if (hookState.committedWaypoints === null) return;
        onWaypointsCommitRef.current?.(hookState.committedWaypoints);
    }, [hookState.committedWaypoints]);

    const addWaypoint = useCallback(
        (latLng: LatLng): void => {
            setHookState((prev) => {
                const next = waypointEditor.addWaypoint(prev.editorState, latLng, {
                    createId,
                    maxWaypointCount,
                });

                if ("reason" in next.result) {
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
                    committedWaypoints: toLatLngs(next.state.nodes),
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

            if (next.result !== undefined) {
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
                committedWaypoints: toLatLngs(next.state.nodes),
            };
        });
    }, []);

    const deleteBatchWaypoint = useCallback((ids: WaypointNodeId[]): void => {
        setHookState((prev) => {
            const next = waypointEditor.deleteBatchWaypoint(prev.editorState, ids);

            if (next.result !== undefined) {
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
                committedWaypoints: toLatLngs(next.state.nodes),
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
                result: undefined,
                committedWaypoints: toLatLngs(next.state.nodes),
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

    const beginBatchMove = useCallback((ids: WaypointNodeId[], latLng: LatLng): void => {
        setHookState((prev) => {
            const next = waypointEditor.beginBatchMove(prev.editorState, ids, latLng);

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

    const updateBatchMove = useCallback((latLng: LatLng): void => {
        setHookState((prev) => ({
            ...prev,
            editorState: waypointEditor.updateBatchMove(prev.editorState, latLng),
        }));
    }, []);

    const commitWaypointMove = useCallback((): void => {
        setHookState((prev) => {
            const next = waypointEditor.commitWaypointMove(prev.editorState);

            if (next.result !== undefined) {
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
                committedWaypoints: toLatLngs(next.state.nodes),
            };
        });
    }, []);

    const commitBatchMove = useCallback((): void => {
        setHookState((prev) => {
            const next = waypointEditor.commitBatchMove(prev.editorState);

            if (next.result !== undefined) {
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
                committedWaypoints: toLatLngs(next.state.nodes),
            };
        });
    }, []);

    const undoWaypoint = useCallback((): void => {
        setHookState((prev) => {
            if (isMoveActive(prev.editorState.status) || !waypointHistory.canUndo(prev.historyState)) {
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
                committedWaypoints: toLatLngs(waypointHistory.getCurrent(nextHistoryState)),
            };
        });
    }, []);

    const redoWaypoint = useCallback((): void => {
        setHookState((prev) => {
            if (isMoveActive(prev.editorState.status) || !waypointHistory.canRedo(prev.historyState)) {
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
                committedWaypoints: toLatLngs(waypointHistory.getCurrent(nextHistoryState)),
            };
        });
    }, []);

    const restoreWaypoints = useCallback(
        (waypoints: LatLng[]): void => {
            setHookState((prev) => {
                if (hasSameWaypoints(prev.editorState.nodes, waypoints)) return prev;

                const nodes = waypoints.map((latLng) => ({ id: createId(), latLng: { ...latLng } }));
                return {
                    editorState: waypointEditor.restoreNodes(waypointEditor.createInitialState(), nodes),
                    historyState: waypointHistory.create(nodes),
                    result: null,
                    committedWaypoints: null,
                };
            });
        },
        [createId],
    );

    const editorState = hookState.editorState;
    const visibleWaypoints = useMemo(() => getVisibleWaypoints(editorState), [editorState]);
    const canUseHistory = !isMoveActive(editorState.status);

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
            deleteBatchWaypoint,
            deleteAllWaypoint,
            beginWaypointMove,
            beginBatchMove,
            updateWaypointMove,
            updateBatchMove,
            commitWaypointMove,
            commitBatchMove,
            undoWaypoint,
            redoWaypoint,
            restoreWaypoints,
        },
    };
}

function getVisibleWaypoints(state: WaypointEditorState): WaypointNode[] {
    if (state.status.statusName === "batchMoving") {
        const delta = getLatLngDelta(state.status.originLatLng, state.status.latLng);
        const movingNodeIds = new Set(state.status.movingNodeIds);

        return state.nodes.map((node) =>
            movingNodeIds.has(node.id)
                ? {
                      ...node,
                      latLng: addLatLngDelta(node.latLng, delta),
                  }
                : node,
        );
    }

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

function isMoveActive(status: WaypointEditorState["status"]): boolean {
    return status.statusName === "moving" || status.statusName === "batchMoving";
}

function getLatLngDelta(origin: LatLng, current: LatLng): LatLng {
    return {
        lat: current.lat - origin.lat,
        lng: current.lng - origin.lng,
    };
}

function addLatLngDelta(latLng: LatLng, delta: LatLng): LatLng {
    return {
        lat: latLng.lat + delta.lat,
        lng: latLng.lng + delta.lng,
    };
}

function toLatLngs(nodes: WaypointNode[]): LatLng[] {
    return nodes.map(({ latLng }) => ({ ...latLng }));
}

function hasSameWaypoints(nodes: WaypointNode[], waypoints: LatLng[]): boolean {
    return (
        nodes.length === waypoints.length &&
        nodes.every((node, index) => {
            const waypoint = waypoints[index];
            return waypoint !== undefined && node.latLng.lat === waypoint.lat && node.latLng.lng === waypoint.lng;
        })
    );
}
