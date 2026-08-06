import { useCallback, useMemo, useState } from "react";
import {
    type AddWaypointResult,
    type BeginWaypointMoveResult,
    type CommitWaypointMoveResult,
    type DeleteAllWaypointResult,
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

const defaultCreateId = () => crypto.randomUUID();

export function useWaypointEditor({ createId = defaultCreateId, maxWaypointCount }: UseWaypointEditorOptions = {}) {
    const [editorState, setEditorState] = useState(() => waypointEditor.createInitialState());

    const addWaypoint = useCallback(
        (latLng: LatLng): AddWaypointResult => {
            let result: AddWaypointResult = { code: 1, reason: "OVERFLOW" };

            setEditorState((prev) => {
                const next = waypointEditor.addWaypoint(prev, latLng, {
                    createId,
                    maxWaypointCount,
                });

                result = next.result;

                return next.state;
            });

            return result;
        },
        [createId, maxWaypointCount],
    );

    const selectWaypoint = useCallback(
        (id: WaypointNodeId): SelectWaypointResult => {
            let result: SelectWaypointResult = { code: 2, reason: "INVALID_INPUT" };

            setEditorState((prev) => {
                const next = waypointEditor.selectWaypoint(prev, id);

                result = next.result;

                return next.state;
            });

            return result;
        },
        [],
    );

    const deleteWaypoint = useCallback(
        (id: WaypointNodeId): DeleteWaypointResult => {
            let result: DeleteWaypointResult = { code: 2, reason: "INVALID_INPUT" };

            setEditorState((prev) => {
                const next = waypointEditor.deleteWaypoint(prev, id);

                result = next.result;

                return next.state;
            });

            return result;
        },
        [],
    );

    const deleteAllWaypoint = useCallback((): DeleteAllWaypointResult => {
        let result: DeleteAllWaypointResult;

        setEditorState((prev) => {
            const next = waypointEditor.deleteAllWaypoint(prev);

            result = next.result;

            return next.state;
        });

        return result;
    }, []);

    const beginWaypointMove = useCallback(
        (id: WaypointNodeId, latLng: LatLng): BeginWaypointMoveResult => {
            let result: BeginWaypointMoveResult = { code: 2, reason: "INVALID_INPUT" };

            setEditorState((prev) => {
                const next = waypointEditor.beginWaypointMove(prev, id, latLng);

                result = next.result;

                return next.state;
            });

            return result;
        },
        [],
    );

    const updateWaypointMove = useCallback(
        (id: WaypointNodeId, latLng: LatLng): void => {
            setEditorState((prev) => waypointEditor.updateWaypointMove(prev, id, latLng));
        },
        [],
    );

    const commitWaypointMove = useCallback((): CommitWaypointMoveResult => {
        let result: CommitWaypointMoveResult = { code: 2, reason: "INVALID_INPUT" };

        setEditorState((prev) => {
            const next = waypointEditor.commitWaypointMove(prev);

            result = next.result;

            return next.state;
        });

        return result;
    }, []);

    const visibleWaypoints = useMemo(() => getVisibleWaypoints(editorState), [editorState]);

    return {
        state: editorState.status,
        data: {
            waypoints: editorState.nodes,
            visibleWaypoints,
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
