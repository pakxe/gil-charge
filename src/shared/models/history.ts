const DEFAULT_HISTORY_LIMIT = 30;
const MIN_HISTORY_LIMIT = 1;

type HistoryState<T> = {
    snapshots: T[];
    index: number;
    limit: number;
};

function create<T>(initial: T, limit: number = DEFAULT_HISTORY_LIMIT): HistoryState<T> {
    if (limit < MIN_HISTORY_LIMIT) {
        throw new Error(`limit는 ${MIN_HISTORY_LIMIT} 이하는 불가능합니다.`);
    }

    return {
        snapshots: [initial],
        index: 0,
        limit,
    };
}

function getCurrent<T>(history: HistoryState<T>): T {
    const index = history.index;
    const snapshot = history.snapshots[index];

    if (snapshot === undefined) {
        throw new Error("올바른 index가 아닙니다.");
    }

    return snapshot;
}

function commit<T>(history: HistoryState<T>, next: T): HistoryState<T> {
    // 날려버리고 시작
    const snapshots = history.snapshots.slice(0, history.index + 1).concat(next);

    if (snapshots.length > history.limit) {
        return {
            ...history,
            snapshots: snapshots.slice(1),
            index: snapshots.length - 2,
        };
    } else {
        return {
            ...history,
            snapshots,
            index: snapshots.length - 1,
        };
    }
}

function undo<T>(history: HistoryState<T>): HistoryState<T> {
    if (!canUndo(history)) {
        throw new Error("더 이상 undo할 수 없습니다.");
    }

    return {
        ...history,
        index: history.index - 1,
    };
}

function redo<T>(history: HistoryState<T>): HistoryState<T> {
    if (!canRedo(history)) {
        throw new Error("더 이상 redo할 수 없습니다.");
    }

    return {
        ...history,
        index: history.index + 1,
    };
}

function canUndo<T>(history: HistoryState<T>): boolean {
    if (history.index <= 0) {
        return false;
    }

    return true;
}

function canRedo<T>(history: HistoryState<T>): boolean {
    if (history.snapshots.length - 1 <= history.index) {
        return false;
    }

    return true;
}

const history = {
    create,
    getCurrent,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
};

export { history };
export type { HistoryState };
