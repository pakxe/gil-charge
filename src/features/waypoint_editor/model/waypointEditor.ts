import type { LatLng } from "@/shared/model/map";

export const MAX_WAYPOINT_COUNT = 20;

export type WaypointNodeId = string;

export type WaypointNode = {
    id: WaypointNodeId;
    latLng: LatLng;
};

export type WaypointEditorStatus =
    | { state: "idle" }
    | { state: "selected"; selectedNodeId: WaypointNodeId }
    | { state: "dragging"; draggingNodeId: WaypointNodeId; latLng: LatLng };

export type WaypointEditorState = {
    nodes: WaypointNode[];
    status: WaypointEditorStatus;
};

export type AddWaypointResult = { code: 0; node: WaypointNode } | { code: 1; reason: "OVERFLOW" };

type CreateWaypointEditorOptions = {
    createId: () => WaypointNodeId;
    maxWaypointCount?: number;
};

export function createWaypointEditor({ createId, maxWaypointCount = MAX_WAYPOINT_COUNT }: CreateWaypointEditorOptions) {
    const createInitialState = (): WaypointEditorState => ({
        nodes: [],
        status: { state: "idle" },
    });

    const addWaypoint = (
        state: WaypointEditorState,
        latLng: LatLng,
    ): { state: WaypointEditorState; result: AddWaypointResult } => {
        if (state.nodes.length >= maxWaypointCount) {
            return {
                state,
                result: {
                    code: 1,
                    reason: "OVERFLOW",
                },
            };
        }

        const node: WaypointNode = {
            id: createId(),
            latLng: copyLatLng(latLng),
        };

        return {
            state: {
                ...state,
                nodes: [...state.nodes, node],
                status: { state: "idle" },
            },
            result: {
                code: 0,
                node,
            },
        };
    };

    return {
        createInitialState,
        addWaypoint,
    };
}

function copyLatLng(latLng: LatLng): LatLng {
    return {
        lat: latLng.lat,
        lng: latLng.lng,
    };
}
