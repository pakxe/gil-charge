import { useCallback, useMemo, useState } from "react";
import {
    type AddWaypointResult,
    type BeginWaypointMoveResult,
    type CommitWaypointMoveResult,
    type DeleteWaypointResult,
    type SelectWaypointResult,
    type WaypointEditorState,
    type WaypointNode,
    type WaypointNodeId,
    waypointEditor,
} from "@/features/waypoint_editor/model/waypointEditor";
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
    | SelectWaypointResult;

type WaypointEditorHookState = {
    editorState: WaypointEditorState;
    result: WaypointEditorCommandResult | null;
};

const defaultCreateId = () => crypto.randomUUID();

export function useWaypointEditor({ createId = defaultCreateId, maxWaypointCount }: UseWaypointEditorOptions = {}) {
    const [hookState, setHookState] = useState<WaypointEditorHookState>(() => ({
        editorState: waypointEditor.createInitialState(),
        result: null,
    }));

    const addWaypoint = useCallback(
        (latLng: LatLng): void => {
            setHookState((prev) => {
                const next = waypointEditor.addWaypoint(prev.editorState, latLng, {
                    createId,
                    maxWaypointCount,
                });

                return {
                    editorState: next.state,
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

    const deleteWaypoint = useCallback((id: WaypointNodeId): void => {
        setHookState((prev) => {
            const next = waypointEditor.deleteWaypoint(prev.editorState, id);

            return {
                editorState: next.state,
                result: next.result,
            };
        });
    }, []);

    const deleteAllWaypoint = useCallback((): void => {
        setHookState((prev) => {
            const next = waypointEditor.deleteAllWaypoint(prev.editorState);

            return {
                editorState: next.state,
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

            return {
                ...prev,
                editorState: next.state,
                result: next.result,
            };
        });
    }, []);

    const editorState = hookState.editorState;
    const visibleWaypoints = useMemo(() => getVisibleWaypoints(editorState), [editorState]);

    return {
        state: editorState.status,
        data: {
            waypoints: editorState.nodes,
            visibleWaypoints,
            result: hookState.result,
        },
        actions: {
            addWaypoint,
            selectWaypoint,
            deleteWaypoint,
            deleteAllWaypoint,
            beginWaypointMove,
            updateWaypointMove,
            commitWaypointMove,
        },
    };
}

function getVisibleWaypoints(state: WaypointEditorState): WaypointNode[] {
    if (state.status.state !== "moving") {
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
