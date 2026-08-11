import type { WaypointNode } from "@/features/waypoint_editor/model/waypointEditor";

export const DEFAULT_WAYPOINT_HISTORY_LIMIT = 50;

export type WaypointSnapshot = WaypointNode[];

export type WaypointHistoryState = {
    undoStack: WaypointSnapshot[];
    current: WaypointSnapshot;
    redoStack: WaypointSnapshot[];
    limit: number;
};

function create(
    initial: WaypointSnapshot = [],
    limit: number = DEFAULT_WAYPOINT_HISTORY_LIMIT,
): WaypointHistoryState {
    if (limit < 1) {
        throw new Error("waypoint history limit은 1 이상이어야 합니다.");
    }

    return {
        undoStack: [],
        current: copySnapshot(initial),
        redoStack: [],
        limit,
    };
}

function getCurrent(history: WaypointHistoryState): WaypointSnapshot {
    return copySnapshot(history.current);
}

function commit(history: WaypointHistoryState, next: WaypointSnapshot): WaypointHistoryState {
    if (isSameSnapshot(history.current, next)) {
        return history;
    }

    return {
        ...history,
        undoStack: pushUndoSnapshot(history.undoStack, history.current, history.limit),
        current: copySnapshot(next),
        redoStack: [],
    };
}

function undo(history: WaypointHistoryState): WaypointHistoryState {
    const previous = history.undoStack.at(-1);

    if (!previous) {
        return history;
    }

    return {
        ...history,
        undoStack: history.undoStack.slice(0, -1),
        current: copySnapshot(previous),
        redoStack: [...history.redoStack, copySnapshot(history.current)],
    };
}

function redo(history: WaypointHistoryState): WaypointHistoryState {
    const next = history.redoStack.at(-1);

    if (!next) {
        return history;
    }

    return {
        ...history,
        undoStack: pushUndoSnapshot(history.undoStack, history.current, history.limit),
        current: copySnapshot(next),
        redoStack: history.redoStack.slice(0, -1),
    };
}

function canUndo(history: WaypointHistoryState): boolean {
    return history.undoStack.length > 0;
}

function canRedo(history: WaypointHistoryState): boolean {
    return history.redoStack.length > 0;
}

function pushUndoSnapshot(
    undoStack: WaypointSnapshot[],
    snapshot: WaypointSnapshot,
    limit: number,
): WaypointSnapshot[] {
    const nextStack = [...undoStack, copySnapshot(snapshot)];

    if (nextStack.length <= limit) {
        return nextStack;
    }

    return nextStack.slice(nextStack.length - limit);
}

function isSameSnapshot(a: WaypointSnapshot, b: WaypointSnapshot): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((node, index) => {
        const other = b[index];

        return (
            other !== undefined &&
            node.id === other.id &&
            node.latLng.lat === other.latLng.lat &&
            node.latLng.lng === other.latLng.lng
        );
    });
}

function copySnapshot(snapshot: WaypointSnapshot): WaypointSnapshot {
    return snapshot.map((node) => ({
        id: node.id,
        latLng: {
            lat: node.latLng.lat,
            lng: node.latLng.lng,
        },
    }));
}

export const waypointHistory = {
    create,
    getCurrent,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
};
