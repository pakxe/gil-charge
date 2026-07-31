import { history, type HistoryState } from "@/shared/models/history";
import { useReducer } from "react";
import type { LatLng, PathSet } from "@/shared/types/map";

type Mode = "pen" | "waypoint";
type PenMode = "draw" | "erase";
type WaypointMode = "pin" | "erase";

type Snapshot = {
    penPaths: LatLng[];
    waypoints: LatLng[];
};

function createEmptySnapshot(): Snapshot {
    return {
        penPaths: [],
        waypoints: [],
    };
}

export type EditAreaSubmitValue = PathSet[];

export type EditAreaState = {
    mode: Mode;

    // pen
    penMode: PenMode;
    isPenDrawing: boolean;
    penDrawModeDraft: LatLng[];
    penEraseModeDraft: LatLng[];

    // waypoint
    waypointMode: WaypointMode;
    selectedWaypointIndex: number | null;
    waypointDraft: null | {
        // id: string;
        index: number;
        latLng: LatLng;
    };

    // history
    history: HistoryState<Snapshot>;
};

type Action =
    | {
          type: "selectMode";
          next: Mode;
      }
    | {
          type: "dragStart";
          latLng: LatLng;
      }
    | {
          type: "dragMove";
          latLng: LatLng;
      }
    | {
          type: "dragEnd";
      }
    | {
          type: "undo";
      }
    | {
          type: "redo";
      }
    | {
          type: "click";
          // 이때는 웨이포인트 id가 없음
          latLng: LatLng;
      }
    | {
          type: "clickWaypoint";
          waypointId?: string;
          index: number;
      }
    | {
          type: "dragStartWaypoint";
          waypointId?: string;
          index: number;
          latLng: LatLng;
      }
    | {
          type: "dragMoveWaypoint";
          waypointId?: string;
          index: number;
          latLng: LatLng;
      }
    | {
          type: "dragEndWaypoint";
      }
    | {
          type: "deleteWaypoint";
          waypointId?: string;
          index: number;
      }
    | {
          // 이건 나중에 하자.....
          type: "clickEdge";
      };

export function createEditAreaInitialState(): EditAreaState {
    return {
        mode: "waypoint",
        penMode: "draw",
        waypointMode: "pin",
        selectedWaypointIndex: null,
        isPenDrawing: false,
        history: history.create(createEmptySnapshot(), 20),
        penDrawModeDraft: [],
        penEraseModeDraft: [],
        waypointDraft: null,
    };
}

export function editAreaReducer(state: EditAreaState, action: Action): EditAreaState {
    switch (action.type) {
        case "selectMode":
            return {
                ...state,
                mode: action.next,
                penMode: "draw",
                waypointMode: "pin",
                selectedWaypointIndex: null,
                isPenDrawing: false,
                penDrawModeDraft: [],
                penEraseModeDraft: [],
                history: history.create(createEmptySnapshot(), 20),
            };

        case "dragStart":
            if (state.mode !== "pen") {
                return state;
            }

            // if (state.penMode === 'erase') { ... }

            return {
                ...state,
                isPenDrawing: true,
                penDrawModeDraft: [action.latLng],
            };

        case "dragMove":
            if (state.mode !== "pen") {
                return state;
            }

            if (!state.isPenDrawing) {
                return state;
            }

            // if (state.penMode === 'erase') { ... }

            return {
                ...state,
                penDrawModeDraft: [...state.penDrawModeDraft, action.latLng],
            };

        case "dragEnd": {
            if (state.mode !== "pen" || !state.isPenDrawing) {
                return state;
            }

            const current = history.getCurrent(state.history);

            return {
                ...state,
                history: history.commit(state.history, {
                    penPaths: [...current.penPaths, ...state.penDrawModeDraft],
                    waypoints: [],
                }),
                isPenDrawing: false,
                penDrawModeDraft: [],
            };
        }

        case "undo":
            return {
                ...state,
                history: history.undo(state.history),
            };

        case "redo":
            return {
                ...state,
                history: history.redo(state.history),
            };

        case "click": {
            if (state.mode !== "waypoint") {
                return state;
            }

            const current = history.getCurrent(state.history);
            const nextWaypoints = [...current.waypoints];

            nextWaypoints.push(action.latLng);

            return {
                ...state,
                history: history.commit(state.history, {
                    ...current,
                    waypoints: nextWaypoints,
                }),
                selectedWaypointIndex: null,
            };
        }

        case "clickWaypoint":
            if (state.mode !== "waypoint") {
                return { ...state };
            }

            return {
                ...state,
                // 다시 클릭하면 선택 해제
                selectedWaypointIndex: state.selectedWaypointIndex === action.index ? null : action.index,
            };

        case "dragStartWaypoint":
            if (state.mode !== "waypoint") {
                return { ...state };
            }

            return {
                ...state,
                waypointDraft: {
                    index: action.index,
                    latLng: action.latLng,
                },
            };

        case "dragMoveWaypoint":
            if (state.mode !== "waypoint") {
                return { ...state };
            }

            return {
                ...state,
                waypointDraft: {
                    index: action.index,
                    latLng: action.latLng,
                },
            };

        case "dragEndWaypoint": {
            if (state.mode !== "waypoint") {
                return state;
            }

            if (!state.waypointDraft) {
                return state;
            }

            const current = history.getCurrent(state.history);
            const nextWaypoints = [...current.waypoints];

            nextWaypoints[state.waypointDraft.index] = state.waypointDraft.latLng;

            return {
                ...state,
                history: history.commit(state.history, {
                    ...current,
                    waypoints: nextWaypoints,
                }),
                waypointDraft: null,
            };
        }

        case "deleteWaypoint": {
            if (state.mode !== "waypoint") {
                return state;
            }

            const current = history.getCurrent(state.history);
            const nextWaypoints = [
                ...current.waypoints.slice(0, action.index),
                ...current.waypoints.slice(action.index + 1),
            ];

            return {
                ...state,
                history: history.commit(state.history, {
                    ...current,
                    waypoints: nextWaypoints,
                }),
                selectedWaypointIndex:
                    state.selectedWaypointIndex === action.index ? null : state.selectedWaypointIndex,
            };
        }

        default:
            return state;
    }
}
export function useEditArea() {
    const [state, dispatch] = useReducer(editAreaReducer, undefined, () => createEditAreaInitialState());

    const current = history.getCurrent(state.history);

    const visiblePenPaths = [...current.penPaths, ...state.penDrawModeDraft];

    const visibleWaypoints = [...current.waypoints];
    const visibleSnapshot = getResolvedSnapshot(state);

    if (state.waypointDraft) {
        visibleWaypoints[state.waypointDraft.index] = state.waypointDraft.latLng;
    }

    const getSubmitValue = (): EditAreaSubmitValue => {
        return toSubmitValue(visibleSnapshot, crypto.randomUUID());
    };

    const selectMode = (next: Mode) => {
        dispatch({
            type: "selectMode",
            next,
        });
    };

    const onMapClick = (latLng: LatLng) => {
        dispatch({
            type: "click",
            latLng,
        });
    };

    const onMapDragStart = (latLng: LatLng) => {
        dispatch({
            type: "dragStart",
            latLng,
        });
    };

    const onMapDragMove = (latLng: LatLng) => {
        dispatch({
            type: "dragMove",
            latLng,
        });
    };

    const onMapDragEnd = () => {
        dispatch({
            type: "dragEnd",
        });
    };

    const onWaypointClick = (index: number) => {
        dispatch({
            type: "clickWaypoint",
            index,
        });
    };

    const onWaypointDragStart = (index: number, latLng: LatLng) => {
        dispatch({
            type: "dragStartWaypoint",
            index,
            latLng,
        });
    };

    const onWaypointDragMove = (index: number, latLng: LatLng) => {
        dispatch({
            type: "dragMoveWaypoint",
            index,
            latLng,
        });
    };

    const onWaypointDragEnd = () => {
        dispatch({
            type: "dragEndWaypoint",
        });
    };

    const deleteWaypoint = (index: number) => {
        dispatch({
            type: "deleteWaypoint",
            index,
        });
    };

    const undo = () => {
        dispatch({
            type: "undo",
        });
    };

    const redo = () => {
        dispatch({
            type: "redo",
        });
    };

    return {
        state: {
            mode: state.mode,
            penMode: state.penMode,
            waypointMode: state.waypointMode,
            selectedWaypointIndex: state.selectedWaypointIndex,
            isPenDrawing: state.isPenDrawing,
        },

        data: {
            penPaths: visiblePenPaths,
            waypoints: visibleWaypoints,
        },

        getSubmitValue,

        canUndo: history.canUndo(state.history),
        canRedo: history.canRedo(state.history),

        actions: {
            selectMode,
            onMapClick,
            onMapDragStart,
            onMapDragMove,
            onMapDragEnd,
            onWaypointClick,
            onWaypointDragStart,
            onWaypointDragMove,
            onWaypointDragEnd,
            deleteWaypoint,
            undo,
            redo,
        },
    };
}

function getResolvedSnapshot(state: EditAreaState): Snapshot {
    const current = history.getCurrent(state.history);

    /**
     * pen을 그리고 있는 중이면 draft가 최우선이다.
     * 도메인 규칙상 pen draft가 존재하는 동안 waypoint와 공존하지 않는다.
     */
    if (state.penDrawModeDraft.length > 0) {
        return {
            penPaths: [...state.penDrawModeDraft],
            waypoints: [],
        };
    }

    if (state.waypointDraft) {
        const nextWaypoints = [...current.waypoints];

        nextWaypoints[state.waypointDraft.index] = state.waypointDraft.latLng;

        return {
            penPaths: [],
            waypoints: nextWaypoints,
        };
    }

    if (current.waypoints.length > 0) {
        return {
            penPaths: [],
            waypoints: [...current.waypoints],
        };
    }

    if (current.penPaths.length > 0) {
        return {
            penPaths: [...current.penPaths],
            waypoints: [],
        };
    }

    return createEmptySnapshot();
}
function toSubmitValue(snapshot: Snapshot, pathSetId: string): EditAreaSubmitValue {
    if (snapshot.penPaths.length > 0) {
        return [
            {
                id: pathSetId,
                type: "pen",
                points: snapshot.penPaths.map(copyLatLng),
            },
        ];
    }

    if (snapshot.waypoints.length > 0) {
        return [
            {
                id: pathSetId,
                type: "waypoint",
                points: Array.from(snapshot.waypoints.values()).map(copyLatLng),
            },
        ];
    }

    return [];
}

function copyLatLng(latLng: LatLng): LatLng {
    return {
        lat: latLng.lat,
        lng: latLng.lng,
    };
}
