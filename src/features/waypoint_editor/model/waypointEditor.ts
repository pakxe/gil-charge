import type { LatLng } from "@/shared/model/map";

export const MAX_WAYPOINT_COUNT = 20;

export type WaypointNodeId = string;

export type WaypointEditorMode = "waypoint" | "lasso";

export type WaypointNode = {
    id: WaypointNodeId;
    latLng: LatLng;
};

export type WaypointEditorStatus =
    | { statusName: "idle" }
    | { statusName: "selected"; selectedNodeIds: WaypointNodeId[] }
    | {
          statusName: "moving";
          movingNodeId: WaypointNodeId;
          latLng: LatLng;
          selectionAfterMove: WaypointNodeId[];
      }
    | {
          statusName: "batchMoving";
          movingNodeIds: WaypointNodeId[];
          originLatLng: LatLng;
          latLng: LatLng;
          selectionAfterMove: WaypointNodeId[];
      };

export type WaypointEditorState = {
    nodes: WaypointNode[];
    status: WaypointEditorStatus;
};

export type AddWaypointResult = { node: WaypointNode } | { reason: "OVERFLOW" };
export type SelectWaypointResult = void | { reason: "INVALID_INPUT" };
export type SelectWaypointsResult = void | { reason: "INVALID_INPUT" };
export type DeleteWaypointResult = void | { reason: "INVALID_INPUT" };
export type DeleteBatchWaypointResult = void | { reason: "INVALID_INPUT" };
export type DeleteAllWaypointResult = void;
export type BeginWaypointMoveResult = void | { reason: "INVALID_INPUT" };
export type CommitWaypointMoveResult = void | { reason: "INVALID_INPUT" };
export type BeginBatchMoveResult = void | { reason: "INVALID_INPUT" };
export type CommitBatchMoveResult = void | { reason: "INVALID_INPUT" };

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
                reason: "INVALID_INPUT",
            },
        };
    }

    if (state.status.statusName === "selected" && isSameSelection(state.status.selectedNodeIds, [id])) {
        return {
            state: {
                ...state,
                status: { statusName: "idle" },
            },
            result: undefined,
        };
    }

    return {
        state: {
            ...state,
            status: {
                statusName: "selected",
                selectedNodeIds: [id],
            },
        },
        result: undefined,
    };
}

function selectWaypoints(
    state: WaypointEditorState,
    ids: WaypointNodeId[],
): { state: WaypointEditorState; result: SelectWaypointsResult } {
    if (!ids.every((id) => hasWaypoint(state, id))) {
        return {
            state,
            result: {
                reason: "INVALID_INPUT",
            },
        };
    }

    return {
        state: {
            ...state,
            status: getStatusFromSelection(ids),
        },
        result: undefined,
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
        result: undefined,
    };
}

function deleteBatchWaypoint(
    state: WaypointEditorState,
    ids: WaypointNodeId[],
): { state: WaypointEditorState; result: DeleteBatchWaypointResult } {
    if (ids.length === 0 || !ids.every((id) => hasWaypoint(state, id))) {
        return {
            state,
            result: {
                reason: "INVALID_INPUT",
            },
        };
    }

    const deletedNodeIds = new Set(ids);

    return {
        state: {
            ...state,
            nodes: state.nodes.filter((node) => !deletedNodeIds.has(node.id)),
            status: getStatusAfterBatchDelete(state.status, deletedNodeIds),
        },
        result: undefined,
    };
}

function deleteAllWaypoint(state: WaypointEditorState): {
    state: WaypointEditorState;
    result: DeleteAllWaypointResult;
} {
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
    if (!hasWaypoint(state, id) || isMoveActive(state.status)) {
        return {
            state,
            result: {
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
                selectionAfterMove:
                    state.status.statusName === "selected" && state.status.selectedNodeIds.includes(id)
                        ? copyWaypointNodeIds(state.status.selectedNodeIds)
                        : [],
            },
        },
        result: undefined,
    };
}

function beginBatchMove(
    state: WaypointEditorState,
    ids: WaypointNodeId[],
    latLng: LatLng,
): { state: WaypointEditorState; result: BeginBatchMoveResult } {
    if (ids.length === 0 || !ids.every((id) => hasWaypoint(state, id)) || isMoveActive(state.status)) {
        return {
            state,
            result: {
                reason: "INVALID_INPUT",
            },
        };
    }

    return {
        state: {
            ...state,
            status: {
                statusName: "batchMoving",
                movingNodeIds: copyWaypointNodeIds(ids),
                originLatLng: copyLatLng(latLng),
                latLng: copyLatLng(latLng),
                selectionAfterMove: copyWaypointNodeIds(ids),
            },
        },
        result: undefined,
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

function updateBatchMove(state: WaypointEditorState, latLng: LatLng): WaypointEditorState {
    if (state.status.statusName !== "batchMoving") {
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
        result: undefined,
    };
}

function commitBatchMove(
    state: WaypointEditorState,
    { isValidLatLng = () => true }: CommitWaypointMoveOptions = {},
): { state: WaypointEditorState; result: CommitBatchMoveResult } {
    if (state.status.statusName !== "batchMoving") {
        return {
            state,
            result: {
                reason: "INVALID_INPUT",
            },
        };
    }

    const movingStatus = state.status;
    const delta = getLatLngDelta(movingStatus.originLatLng, movingStatus.latLng);
    const movingNodeIds = new Set(movingStatus.movingNodeIds);
    const nextStatus = getStatusAfterMove(movingStatus.selectionAfterMove);
    const nextNodes = state.nodes.map((node) =>
        movingNodeIds.has(node.id)
            ? {
                  ...node,
                  latLng: addLatLngDelta(node.latLng, delta),
              }
            : node,
    );

    if (!nextNodes.every((node) => !movingNodeIds.has(node.id) || isValidLatLng(node.latLng))) {
        return {
            state: {
                ...state,
                status: nextStatus,
            },
            result: {
                reason: "INVALID_INPUT",
            },
        };
    }

    return {
        state: {
            ...state,
            nodes: nextNodes,
            status: nextStatus,
        },
        result: undefined,
    };
}

export const waypointEditor = {
    createInitialState,
    addWaypoint,
    selectWaypoint,
    selectWaypoints,
    deleteWaypoint,
    deleteBatchWaypoint,
    deleteAllWaypoint,
    restoreNodes,
    beginWaypointMove,
    beginBatchMove,
    updateWaypointMove,
    updateBatchMove,
    commitWaypointMove,
    commitBatchMove,
};

function hasWaypoint(state: WaypointEditorState, id: WaypointNodeId) {
    return state.nodes.some((node) => node.id === id);
}

function getStatusAfterDelete(status: WaypointEditorStatus, deletedNodeId: WaypointNodeId): WaypointEditorStatus {
    if (status.statusName === "selected") {
        return getStatusFromSelection(
            status.selectedNodeIds.filter((selectedNodeId) => selectedNodeId !== deletedNodeId),
        );
    }

    if (status.statusName === "moving" && status.movingNodeId === deletedNodeId) {
        return { statusName: "idle" };
    }

    if (status.statusName === "batchMoving" && status.movingNodeIds.includes(deletedNodeId)) {
        return { statusName: "idle" };
    }

    return status;
}

function getStatusAfterBatchDelete(
    status: WaypointEditorStatus,
    deletedNodeIds: ReadonlySet<WaypointNodeId>,
): WaypointEditorStatus {
    if (status.statusName === "selected") {
        return getStatusFromSelection(
            status.selectedNodeIds.filter((selectedNodeId) => !deletedNodeIds.has(selectedNodeId)),
        );
    }

    if (status.statusName === "moving" && deletedNodeIds.has(status.movingNodeId)) {
        return { statusName: "idle" };
    }

    if (status.statusName === "batchMoving" && status.movingNodeIds.some((movingNodeId) => deletedNodeIds.has(movingNodeId))) {
        return { statusName: "idle" };
    }

    return status;
}

function getStatusAfterMove(selectionAfterMove: WaypointNodeId[]): WaypointEditorStatus {
    return getStatusFromSelection(selectionAfterMove);
}

function getStatusAfterRestore(status: WaypointEditorStatus, nodes: WaypointNode[]): WaypointEditorStatus {
    if (status.statusName !== "selected") {
        return { statusName: "idle" };
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    const selectedNodeIds = status.selectedNodeIds.filter((selectedNodeId) => nodeIds.has(selectedNodeId));

    return getStatusFromSelection(selectedNodeIds);
}

function getStatusFromSelection(selectedNodeIds: WaypointNodeId[]): WaypointEditorStatus {
    if (selectedNodeIds.length === 0) {
        return { statusName: "idle" };
    }

    return {
        statusName: "selected",
        selectedNodeIds: copyWaypointNodeIds(selectedNodeIds),
    };
}

function isSameSelection(a: WaypointNodeId[], b: WaypointNodeId[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((id, index) => id === b[index]);
}

function copyWaypointNodeIds(nodeIds: WaypointNodeId[]): WaypointNodeId[] {
    return [...nodeIds];
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

function isMoveActive(status: WaypointEditorStatus): boolean {
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
