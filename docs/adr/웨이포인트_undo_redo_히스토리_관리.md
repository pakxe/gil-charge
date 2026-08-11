# 웨이포인트 undo/redo 히스토리 관리

- 상태: 채택
- 작성일: 2026-08-11

## 배경

웨이포인트 에디터는 웨이포인트 추가, 삭제, 이동 같은 편집을 제공한다.
사용자는 편집 중 실수했을 때 이전 상태로 돌아갈 수 있어야 하고, 되돌린 편집을 다시 실행할 수도 있어야 한다.

관찰 가능한 동작은 다음과 같다.

- undo할 편집이 있으면 undo 버튼이 활성화된다.
- undo 버튼을 누르면 현재 편집 이전의 웨이포인트 모습으로 돌아간다.
    - 웨이포인트 추가는 추가 이전으로 돌아간다.
    - 웨이포인트 삭제는 삭제 이전으로 돌아간다.
    - 웨이포인트 이동은 이동을 시작했을 때의 위치로 돌아간다.
- redo할 편집이 있으면 redo 버튼이 활성화된다.
- 새로운 편집이 발생했는데 redo 가능한 이후 편집이 있다면, 이후 편집은 제거한다.
- 동일한 결과가 만들어진 편집은 히스토리에 추가하지 않는다.
- undo, redo는 최대 50번까지 가능하다.

이 ADR에서는 두 가지 문제를 분리해서 결정한다.

1. 히스토리에 무엇을 저장할 것인가
2. 선택한 히스토리 데이터를 어떤 자료구조로 구현할 것인가

## 문제 1. 히스토리에 무엇을 저장할 것인가

undo/redo를 구현하려면 편집 이력을 저장해야 한다.
이때 저장 대상은 크게 세 가지로 나눌 수 있다.

### 해결 방안들

#### 방안 1. 현재 모든 웨이포인트의 snapshot을 저장한다

편집이 확정될 때마다 전체 웨이포인트 목록을 저장한다.

- 장점: 구현이 단순하다.
- 장점: 편집 방식이 늘어나도 같은 방식으로 처리할 수 있다.
- 단점: 액션이나 diff보다 저장 용량이 크다.
- 단점: 어떤 의도로 변경됐는지 액션 이름으로 바로 파악하기는 어렵다.

#### 방안 2. 액션을 저장한다

`add`, `delete`, `move` 같은 편집 액션과 필요한 데이터를 저장한다.
undo/redo 시에는 저장된 액션의 반대 동작을 실행한다.

- 장점: 저장 용량이 작다.
- 장점: 어떤 편집이 일어났는지 디버깅하기 쉽다.
- 단점: 각 액션마다 반대 동작을 정의해야 한다.
- 단점: 새로운 편집 방식이 추가될 때 히스토리 로직도 함께 확장해야 한다.

#### 방안 3. 차이를 저장한다

이전 웨이포인트 목록과 다음 웨이포인트 목록의 차이만 저장한다.

- 장점: 저장 용량이 작다.
- 단점: snapshot보다 구현이 어렵다.
- 단점: 웨이포인트 자료구조가 바뀌면 diff 계산과 적용 로직도 영향을 받기 쉽다.

### 방안 선택

snapshot 방식을 선택한다.

웨이포인트는 최대 개수가 작고, 히스토리도 제한된 횟수만 저장한다.
따라서 snapshot 방식의 메모리 비용은 감수할 수 있다.

또한 이후 웨이포인트 batch 편집이나 새로운 편집 방식이 추가될 수 있다.
이때 액션 방식은 각 편집마다 반대 동작을 새로 정의해야 하지만, snapshot 방식은 편집 방식이 늘어나도 같은 복원 규칙을 사용할 수 있다.

snapshot에는 웨이포인트 데이터만 포함한다.
선택 상태나 이동 중 draft 상태는 snapshot에 포함하지 않는다.

## 문제 2. snapshot 히스토리를 어떻게 구현할 것인가

문제 1에서 snapshot 방식을 선택했다.
이제 여러 snapshot을 어떤 자료구조로 관리할지 결정해야 한다.

### 해결 방안들

#### 방안 1. index 방식

하나의 snapshot 배열과 현재 index를 함께 관리한다.

```ts
type HistoryState = {
    snapshots: WaypointSnapshot[];
    index: number;
    limit: number;
};
```

- 장점: 하나의 배열 안에 과거, 현재, 미래 snapshot이 모두 들어 있다.
- 단점: commit 시 현재 index 이후 snapshot을 잘라야 한다.
- 단점: 현재 index가 유효한지 계속 관리해야 한다.
- 단점: TypeScript에서 배열 접근 결과의 유효성을 확인하는 코드가 늘어날 수 있다.

#### 방안 2. stack 방식

undo 가능한 snapshot과 redo 가능한 snapshot을 별도 stack으로 관리하고, 현재 snapshot을 따로 둔다.

```ts
type WaypointHistoryState = {
    undoStack: WaypointSnapshot[];
    current: WaypointSnapshot;
    redoStack: WaypointSnapshot[];
    limit: number;
};
```

- 장점: undo 가능한 과거와 redo 가능한 미래가 명확히 분리된다.
- 장점: 현재 index의 유효성을 관리하지 않아도 된다.
- 단점: 현재 snapshot을 별도로 두고 stack 이동 규칙을 정의해야 한다.

### 방안 선택

stack 방식을 선택한다.

undo/redo는 "과거로 이동한다"와 "다시 미래로 이동한다"는 두 방향의 이동이다.
`undoStack`과 `redoStack`은 이 의미를 자료구조로 직접 표현한다.

index 방식은 하나의 배열로 관리할 수 있다는 장점이 있지만, 현재 index의 유효성, 현재 index 이후 snapshot 제거, limit 유지 규칙을 함께 관리해야 한다.
반면 stack 방식은 undo 가능한 과거와 redo 가능한 미래가 분리되므로, 각 명령이 조작해야 하는 대상이 더 명확하다.

동작 규칙은 다음과 같다.

- commit
    - `current`를 `undoStack`에 쌓는다.
    - 새 snapshot을 `current`로 만든다.
    - `redoStack`은 비운다.
- undo
    - `undoStack`의 마지막 snapshot을 `current`로 만든다.
    - 이전 `current`는 `redoStack`에 쌓는다.
- redo
    - `redoStack`의 마지막 snapshot을 `current`로 만든다.
    - 이전 `current`는 `undoStack`에 쌓는다.

## 최종 결과

- 웨이포인트 undo/redo는 snapshot 기반으로 동작한다.
- 히스토리 상태는 `undoStack`, `current`, `redoStack`으로 표현한다.
- snapshot 비교는 웨이포인트 id, 순서, `lat`, `lng`가 모두 같으면 동일한 결과로 본다.
- snapshot은 외부 변경에 영향을 받지 않도록 복사해서 저장하고 복사해서 반환한다.
- `undoStack`은 최대 50개까지만 유지한다.
- redo 가능한 상태에서 새 편집을 commit하면 `redoStack`은 비운다.
- 선택 상태는 snapshot에 저장하지 않는다.
- 이동 중 draft 좌표는 snapshot에 저장하지 않는다.
- 이동 중에는 undo/redo를 활성화하지 않는다.
- 웨이포인트 추가, 삭제, 전체 삭제, 이동 확정처럼 확정된 편집만 commit한다.
- 실패한 편집이나 결과가 동일한 편집은 commit하지 않는다.
- 히스토리 자료구조와 전이 규칙은 `model/waypointHistory.ts`에 둔다.
- undo/redo로 받은 snapshot을 에디터 상태에 복원하는 규칙은 `model/waypointEditor.ts`에 둔다.
- React hook은 `data.canUndo`, `data.canRedo`, `actions.undoWaypoint()`, `actions.redoWaypoint()`를 화면에 연결한다.
