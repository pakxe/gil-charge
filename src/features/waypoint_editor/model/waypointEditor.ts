import type { LatLng } from "@/shared/model/map";

export const MAX_WAYPOINT_COUNT = 20;

export type WaypointNodeId = string;

export type WaypointNode = {
    id: WaypointNodeId;
    latLng: LatLng;
};

export type WaypointEditorStatus =
    | { statusName: "idle" }
    | { statusName: "selected"; selectedNodeId: WaypointNodeId }
    | {
          statusName: "moving";
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

type AddWaypointOptions = {
    createId: () => WaypointNodeId;
    maxWaypointCount?: number;
};

type CommitWaypointMoveOptions = {
    isValidLatLng?: (latLng: LatLng) => boolean;
};

function createInitialState(): WaypointEditorState {
    return {
        nodes: [],
        status: { statusName: "idle" },
    };
}

function addWaypoint(
    state: WaypointEditorState,
    latLng: LatLng,
    { createId, maxWaypointCount = MAX_WAYPOINT_COUNT }: AddWaypointOptions,
): { state: WaypointEditorState; result: AddWaypointResult } {
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
            status: { statusName: "idle" },
        },
        result: {
            code: 0,
            node,
        },
    };
}

function selectWaypoint(
    state: WaypointEditorState,
    id: WaypointNodeId,
): { state: WaypointEditorState; result: SelectWaypointResult } {
    if (!hasWaypoint(state, id)) {
        return {
            state,
            result: {
                code: 2,
                reason: "INVALID_INPUT",
            },
        };
    }

    if (state.status.statusName === "selected" && state.status.selectedNodeId === id) {
        return {
            state: {
                ...state,
                status: { statusName: "idle" },
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
                statusName: "selected",
                selectedNodeId: id,
            },
        },
        result: {
            code: 0,
        },
    };
}

function deleteWaypoint(
    state: WaypointEditorState,
    id: WaypointNodeId,
): { state: WaypointEditorState; result: DeleteWaypointResult } {
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
}

function deleteAllWaypoint(state: WaypointEditorState): { state: WaypointEditorState; result: DeleteAllWaypointResult } {
    return {
        state: {
            ...state,
            nodes: [],
            status: { statusName: "idle" },
        },
        result: undefined,
    };
}

function restoreNodes(state: WaypointEditorState, nodes: WaypointNode[]): WaypointEditorState {
    return {
        nodes: nodes.map(copyWaypointNode),
        status: getStatusAfterRestore(state.status, nodes),
    };
}

function beginWaypointMove(
    state: WaypointEditorState,
    id: WaypointNodeId,
    latLng: LatLng,
): { state: WaypointEditorState; result: BeginWaypointMoveResult } {
    if (!hasWaypoint(state, id) || state.status.statusName === "moving") {
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
                statusName: "moving",
                movingNodeId: id,
                latLng: copyLatLng(latLng),
                selectionAfterMove: state.status.statusName === "selected" && state.status.selectedNodeId === id ? id : null,
            },
        },
        result: {
            code: 0,
        },
    };
}

function updateWaypointMove(state: WaypointEditorState, id: WaypointNodeId, latLng: LatLng): WaypointEditorState {
    if (state.status.statusName !== "moving" || state.status.movingNodeId !== id) {
        return state;
    }

    return {
        ...state,
        status: {
            ...state.status,
            latLng: copyLatLng(latLng),
        },
    };
}

function commitWaypointMove(
    state: WaypointEditorState,
    { isValidLatLng = () => true }: CommitWaypointMoveOptions = {},
): { state: WaypointEditorState; result: CommitWaypointMoveResult } {
    if (state.status.statusName !== "moving") {
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
}

export const waypointEditor = {
    createInitialState,
    addWaypoint,
    selectWaypoint,
    deleteWaypoint,
    deleteAllWaypoint,
    restoreNodes,
    beginWaypointMove,
    updateWaypointMove,
    commitWaypointMove,
};

function hasWaypoint(state: WaypointEditorState, id: WaypointNodeId) {
    return state.nodes.some((node) => node.id === id);
}

function getStatusAfterDelete(
    status: WaypointEditorStatus,
    deletedNodeId: WaypointNodeId,
): WaypointEditorStatus {
    if (status.statusName === "selected" && status.selectedNodeId === deletedNodeId) {
        return { statusName: "idle" };
    }

    if (status.statusName === "moving" && status.movingNodeId === deletedNodeId) {
        return { statusName: "idle" };
    }

    return status;
}

function getStatusAfterMove(selectionAfterMove: WaypointNodeId | null): WaypointEditorStatus {
    if (!selectionAfterMove) {
        return { statusName: "idle" };
    }

    return {
        statusName: "selected",
        selectedNodeId: selectionAfterMove,
    };
}

function getStatusAfterRestore(status: WaypointEditorStatus, nodes: WaypointNode[]): WaypointEditorStatus {
    if (status.statusName !== "selected") {
        return { statusName: "idle" };
    }

    if (!nodes.some((node) => node.id === status.selectedNodeId)) {
        return { statusName: "idle" };
    }

    return status;
}

function copyWaypointNode(node: WaypointNode): WaypointNode {
    return {
        id: node.id,
        latLng: copyLatLng(node.latLng),
    };
}

function copyLatLng(latLng: LatLng): LatLng {
    return {
        lat: latLng.lat,
        lng: latLng.lng,
    };
}
