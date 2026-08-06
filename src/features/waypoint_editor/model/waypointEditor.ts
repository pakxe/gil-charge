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
    | {
          state: "moving";
          movingNodeId: WaypointNodeId;
          latLng: LatLng;
          selectionAfterMove: WaypointNodeId | null;
      };

export type WaypointEditorState = {
    nodes: WaypointNode[];
    status: WaypointEditorStatus;
};

export type AddWaypointResult = { code: 0; node: WaypointNode } | { code: 1; reason: "OVERFLOW" };
export type SelectWaypointResult = { code: 0 } | { code: 2; reason: "INVALID_INPUT" };
export type DeleteWaypointResult = { code: 0 } | { code: 2; reason: "INVALID_INPUT" };
export type DeleteAllWaypointResult = void;
export type BeginWaypointMoveResult = { code: 0 } | { code: 2; reason: "INVALID_INPUT" };
export type CommitWaypointMoveResult = { code: 0 } | { code: 2; reason: "INVALID_INPUT" };

type CreateWaypointEditorOptions = {
    createId: () => WaypointNodeId;
    maxWaypointCount?: number;
    isValidLatLng?: (latLng: LatLng) => boolean;
};

export function createWaypointEditor({
    createId,
    maxWaypointCount = MAX_WAYPOINT_COUNT,
    isValidLatLng = () => true,
}: CreateWaypointEditorOptions) {
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
                status: getStatusAfterDelete(state.status, id),
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

    const beginWaypointMove = (
        state: WaypointEditorState,
        id: WaypointNodeId,
        latLng: LatLng,
    ): { state: WaypointEditorState; result: BeginWaypointMoveResult } => {
        if (!hasWaypoint(state, id) || state.status.state === "moving") {
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
                status: {
                    state: "moving",
                    movingNodeId: id,
                    latLng: copyLatLng(latLng),
                    selectionAfterMove:
                        state.status.state === "selected" && state.status.selectedNodeId === id ? id : null,
                },
            },
            result: {
                code: 0,
            },
        };
    };

    const updateWaypointMove = (state: WaypointEditorState, id: WaypointNodeId, latLng: LatLng): WaypointEditorState => {
        if (state.status.state !== "moving" || state.status.movingNodeId !== id) {
            return state;
        }

        return {
            ...state,
            status: {
                ...state.status,
                latLng: copyLatLng(latLng),
            },
        };
    };

    const commitWaypointMove = (
        state: WaypointEditorState,
    ): { state: WaypointEditorState; result: CommitWaypointMoveResult } => {
        if (state.status.state !== "moving") {
            return {
                state,
                result: {
                    code: 2,
                    reason: "INVALID_INPUT",
                },
            };
        }

        const movingStatus = state.status;
        const nextStatus = getStatusAfterMove(movingStatus.selectionAfterMove);

        if (!isValidLatLng(movingStatus.latLng)) {
            return {
                state: {
                    ...state,
                    status: nextStatus,
                },
                result: {
                    code: 2,
                    reason: "INVALID_INPUT",
                },
            };
        }

        return {
            state: {
                ...state,
                nodes: state.nodes.map((node) =>
                    node.id === movingStatus.movingNodeId
                        ? {
                              ...node,
                              latLng: copyLatLng(movingStatus.latLng),
                          }
                        : node,
                ),
                status: nextStatus,
            },
            result: {
                code: 0,
            },
        };
    };

    return {
        createInitialState,
        addWaypoint,
        selectWaypoint,
        deleteWaypoint,
        deleteAllWaypoint,
        beginWaypointMove,
        updateWaypointMove,
        commitWaypointMove,
    };
}

function hasWaypoint(state: WaypointEditorState, id: WaypointNodeId) {
    return state.nodes.some((node) => node.id === id);
}

function getStatusAfterDelete(
    status: WaypointEditorStatus,
    deletedNodeId: WaypointNodeId,
): WaypointEditorStatus {
    if (status.state === "selected" && status.selectedNodeId === deletedNodeId) {
        return { state: "idle" };
    }

    if (status.state === "moving" && status.movingNodeId === deletedNodeId) {
        return { state: "idle" };
    }

    return status;
}

function getStatusAfterMove(selectionAfterMove: WaypointNodeId | null): WaypointEditorStatus {
    if (!selectionAfterMove) {
        return { state: "idle" };
    }

    return {
        state: "selected",
        selectedNodeId: selectionAfterMove,
    };
}

function copyLatLng(latLng: LatLng): LatLng {
    return {
        lat: latLng.lat,
        lng: latLng.lng,
    };
}
