# 웨이포인트 에디터 model과 hook API 구조

- 상태: 채택
- 작성일: 2026-08-06

## 배경

웨이포인트 에디터의 상태 전이는 model에서, React 연결은 hook에서 담당한다.
기능이 늘어나면서 model과 hook의 경계를 더 선명하게 정할 필요가 생겼다.

고민한 지점은 세 가지다.

- model 명령을 `createWaypointEditor()` 팩토리로 만들지, 순수 함수로 둘지
- `useWaypointEditor`가 state와 ref를 함께 관리해야 하는지
- 이동 중 draft가 반영된 렌더링용 웨이포인트를 어디에서 계산할지

## 결정

### 1. model은 순수 함수를 `waypointEditor` 객체로 묶어 export한다

model 함수는 독립 순수 함수로 작성한다.
다만 사용처에서는 항상 웨이포인트 에디터 명령을 묶어서 쓰므로, export는 `waypointEditor` 객체 하나로 제공한다.

```ts
waypointEditor.addWaypoint(state, latLng, { createId, maxWaypointCount });
waypointEditor.selectWaypoint(state, id);
waypointEditor.beginWaypointMove(state, id, latLng);
```

`createWaypointEditor()` 팩토리는 사용하지 않는다.
각 명령이 필요한 외부 의존성이 다르기 때문이다.
예를 들어 `addWaypoint`는 `createId`가 필요하지만, `selectWaypoint`는 필요하지 않다.
필요한 의존성은 해당 명령의 options 인자로만 받는다.

### 2. hook은 React state 하나로 상태를 관리한다

`useWaypointEditor`는 `WaypointEditorState`를 `useState` 하나로 보관한다.
별도의 `useRef`를 상태 원본으로 두지 않는다.

```ts
setEditorState((prev) => {
    const next = waypointEditor.selectWaypoint(prev, id);
    result = next.result;
    return next.state;
});
```

이동 중 좌표 갱신도 함수형 state update로 처리한다.
이 방식이면 최신 이전 상태를 기준으로 계산할 수 있고, ref와 state를 함께 동기화해야 하는 규칙도 생기지 않는다.

### 3. 렌더링용 파생 데이터는 hook에서 만든다

`data.waypoints`는 확정 데이터인 `state.nodes`를 그대로 노출한다.
`data.visibleWaypoints`는 이동 중 draft 좌표를 반영한 렌더링용 데이터다.

`visibleWaypoints`는 model이 아니라 hook 내부에서 계산한다.
`visible`은 렌더링 관점의 개념이고, model은 확정 데이터와 상태 전이 규칙만 책임지는 편이 더 명확하기 때문이다.

## 구현 규칙

- `model/waypointEditor.ts`
    - React, DOM 이벤트, 지도 SDK 객체를 import하지 않는다.
    - `drag`, `pointer` 같은 입력 장치 용어를 쓰지 않는다.
    - 상태명과 명령명은 `move`, `moving`처럼 도메인 용어를 사용한다.
    - export는 `waypointEditor` 객체 하나로 묶는다.
- `hooks/useWaypointEditor.ts`
    - 상태 원본은 React state 하나다.
    - model 명령은 함수형 `setState(prev => ...)` 안에서 호출한다.
    - UI가 바로 쓸 수 있는 파생 데이터는 hook에서 계산한다.

## 결과

- model은 순수 함수 기반이면서 `waypointEditor.*` 형태의 응집된 API를 제공한다.
- hook은 상태 저장, model 명령 연결, 렌더링용 데이터 제공만 담당한다.
- UI 컴포넌트는 hook의 `status`, `data`, `actions`만 사용한다.
