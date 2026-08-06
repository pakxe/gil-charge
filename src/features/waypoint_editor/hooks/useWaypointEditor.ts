import { useCallback, useMemo, useState } from "react";
import {
    createWaypointEditor,
    type AddWaypointResult,
    type DeleteAllWaypointResult,
    type DeleteWaypointResult,
    type SelectWaypointResult,
    type WaypointNodeId,
} from "@/features/waypoint_editor/model/waypointEditor";
import type { LatLng } from "@/shared/model/map";

type UseWaypointEditorOptions = {
    createId?: () => WaypointNodeId;
    maxWaypointCount?: number;
};

const defaultCreateId = () => crypto.randomUUID();

export function useWaypointEditor({ createId = defaultCreateId, maxWaypointCount }: UseWaypointEditorOptions = {}) {
    const editor = useMemo(
        () =>
            createWaypointEditor({
                createId,
                maxWaypointCount,
            }),
        [createId, maxWaypointCount],
    );
    const [editorState, setEditorState] = useState(() => editor.createInitialState());

    const addWaypoint = useCallback(
        (latLng: LatLng): AddWaypointResult => {
            const next = editor.addWaypoint(editorState, latLng);

            setEditorState(next.state);

            return next.result;
        },
        [editor, editorState],
    );

    const selectWaypoint = useCallback(
        (id: WaypointNodeId): SelectWaypointResult => {
            const next = editor.selectWaypoint(editorState, id);

            setEditorState(next.state);

            return next.result;
        },
        [editor, editorState],
    );

    const deleteWaypoint = useCallback(
        (id: WaypointNodeId): DeleteWaypointResult => {
            const next = editor.deleteWaypoint(editorState, id);

            setEditorState(next.state);

            return next.result;
        },
        [editor, editorState],
    );

    const deleteAllWaypoint = useCallback((): DeleteAllWaypointResult => {
        const next = editor.deleteAllWaypoint(editorState);

        setEditorState(next.state);

        return next.result;
    }, [editor, editorState]);

    return {
        state: editorState.status,
        data: {
            waypoints: editorState.nodes,
        },
        actions: {
            addWaypoint,
            selectWaypoint,
            deleteWaypoint,
            deleteAllWaypoint,
        },
    };
}
