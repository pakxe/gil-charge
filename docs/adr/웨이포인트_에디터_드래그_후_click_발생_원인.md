# 웨이포인트 에디터 드래그 후 click 발생 원인

- 상태: 기록
- 작성일: 2026-08-06

## 문제 상황

`/search-station-by-path`에서 선택되지 않은 웨이포인트 마커를 드래그해 위치를 이동하면, 드래그가 끝난 뒤 해당 마커가 선택 상태로 바뀌는 문제가 발생한다.

의도한 동작은 다음과 같다.

- 드래그 시작 전에 선택되어 있던 마커는 이동 후에도 선택 상태를 유지한다.
- 드래그 시작 전에 선택되어 있지 않았던 마커는 이동 후 `idle` 상태로 남는다.

하지만 실제로는 선택되지 않은 마커를 충분히 멀리 드래그해도, `pointerup` 이후 `click` 이벤트가 발생하면서 `selectWaypoint`가 실행된다.
그 결과 이동 직후 마커가 선택 상태로 바뀐다.

## 원인

드래그 종료 후 `click` 이벤트가 발생하는 원인은 pointer capture 자체가 아니라, 드래그 중 React 상태 업데이트로 마커 오버레이 DOM이 커서를 따라 이동하기 때문으로 본다.

드래그 중에는 `onWaypointMoveUpdate`가 계속 호출되고, 이 결과로 웨이포인트 좌표 상태가 갱신된다.
화면에서는 `<Map.CustomOverlay position={waypoint.latLng}>`의 `position`이 실시간으로 바뀌므로, 마커 DOM 요소도 커서 위치를 따라 이동한다.

브라우저는 일반적으로 `pointerdown`이 발생한 요소 위에서 다시 `pointerup`이 발생하면 `click`을 합성할 수 있다.
이때 사용자가 실제로는 마우스를 멀리 이동했더라도, 마커 DOM이 커서를 계속 따라왔기 때문에 `pointerup` 시점에는 커서 아래에 다시 같은 마커 요소가 놓여 있을 수 있다.

결과적으로 브라우저 관점에서는 "같은 요소 위에서 누르고 같은 요소 위에서 뗀" 흐름이 되어, 드래그 거리와 무관하게 최종 `click` 이벤트가 발생할 수 있다.

## 방안

### 방안 1. 드래그 여부와 click 억제 여부를 분리한다

`isDraggingRef`는 현재 pointer gesture가 드래그인지 판정하는 데만 사용하고, `suppressClickRef`를 별도로 두어 드래그 후 발생하는 다음 `click`을 무시한다.

- 장점: 각 ref의 의미가 분명하다.
- 장점: `pointerup`에서 드래그 상태를 정리해도 click 억제 상태를 유지할 수 있다.
- 단점: 같은 이벤트 흐름을 관리하는 ref가 늘어난다.
- 단점: `suppressClickRef`를 언제 초기화할지 별도 규칙이 필요하다.

### 방안 2. `isDraggingRef`를 click 억제 플래그로도 사용한다

`pointermove`에서 일정 거리 이상 이동하면 `isDraggingRef.current = true`로 두고, `pointerup`에서는 값을 유지한다.
이후 `click` 핸들러에서 `isDraggingRef.current`가 `true`이면 click을 무시하고 값을 `false`로 되돌린다.

- 장점: 필요한 ref가 적다.
- 장점: 드래그 판정과 드래그 후 click 무시 흐름이 한 값으로 연결된다.
- 단점: `pointerup`에서 `isDraggingRef`를 바로 초기화하면 같은 문제가 다시 발생한다.
- 단점: `click`이 발생하지 않는 예외 흐름에서는 다음 pointer gesture에서 값을 초기화해야 한다.

# 결론

현재는 방안 2를 사용한다.
변수를 늘리지 않으면서도 문제의 핵심인 "드래그 후 발생한 click은 선택으로 처리하지 않는다"는 요구를 만족하기 때문이다.
