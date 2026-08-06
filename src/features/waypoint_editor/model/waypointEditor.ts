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
export type SelectWaypointResult = { code: 0 } | { code: 2; reason: "INVALID_INPUT" };
export type DeleteWaypointResult = { code: 0 } | { code: 2; reason: "INVALID_INPUT" };
export type DeleteAllWaypointResult = void;

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

    const selectWaypoint = (
        state: WaypointEditorState,
        id: WaypointNodeId,
    ): { state: WaypointEditorState; result: SelectWaypointResult } => {
        if (!hasWaypoint(state, id)) {
            return {
                state,
                result: {
                    code: 2,
                    reason: "INVALID_INPUT",
                },
            };
        }

        if (state.status.state === "selected" && state.status.selectedNodeId === id) {
            return {
                state: {
                    ...state,
                    status: { state: "idle" },
                },
                result: {
                    code: 0,
                },
            };
        }

        return {
            state: {
                ...state,
                status: {
                    state: "selected",
                    selectedNodeId: id,
                },
            },
            result: {
                code: 0,
            },
        };
    };

    const deleteWaypoint = (
        state: WaypointEditorState,
        id: WaypointNodeId,
    ): { state: WaypointEditorState; result: DeleteWaypointResult } => {
        if (!hasWaypoint(state, id)) {
            return {
                state,
                result: {
                    code: 2,
                    reason: "INVALID_INPUT",
                },
            };
        }

        return {
            state: {
                ...state,
                nodes: state.nodes.filter((node) => node.id !== id),
                status:
                    state.status.state === "selected" && state.status.selectedNodeId === id
                        ? { state: "idle" }
                        : state.status,
            },
            result: {
                code: 0,
            },
        };
    };

    const deleteAllWaypoint = (
        state: WaypointEditorState,
    ): { state: WaypointEditorState; result: DeleteAllWaypointResult } => {
        return {
            state: {
                ...state,
                nodes: [],
                status: { state: "idle" },
            },
            result: undefined,
        };
    };

    return {
        createInitialState,
        addWaypoint,
        selectWaypoint,
        deleteWaypoint,
        deleteAllWaypoint,
    };
}

function hasWaypoint(state: WaypointEditorState, id: WaypointNodeId) {
    return state.nodes.some((node) => node.id === id);
}

function copyLatLng(latLng: LatLng): LatLng {
    return {
        lat: latLng.lat,
        lng: latLng.lng,
    };
}
