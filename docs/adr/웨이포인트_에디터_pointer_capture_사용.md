# 웨이포인트 에디터 pointer 이벤트 추적 방식

- 상태: 채택
- 작성일: 2026-08-06
- 수정일: 2026-08-07

## 문제 1. 마커 밖으로 커서가 벗어나면 드래그가 끊긴다

웨이포인트 마커를 드래그하는 중 마우스 커서가 마커 DOM 영역 밖으로 벗어나면, 이후 `pointermove` 또는 `pointerup` 이벤트를 마커가 받지 못할 수 있다.

이 경우 드래그 중 위치 갱신이 끊기거나, `pointerup`을 놓쳐 이동 확정이 실행되지 않을 수 있다.
이 문제는 빠른 속도로 마우스 커서를 움직이며 웨이포인트를 이동할 때 발견되었다.

## 문제 1의 방안

### 방안 1. pointer capture를 사용한다

`pointerdown`에서 `setPointerCapture(event.pointerId)`를 호출하고, `pointerup` 또는 `pointercancel`에서 capture를 해제한다.

- 장점: 커서가 마커 DOM 밖으로 벗어나도 같은 마커가 `pointermove`와 `pointerup`을 계속 받을 수 있다.
- 장점: window 전역 이벤트 listener 없이 drag gesture를 마커 컴포넌트 안에 둘 수 있다.
- 단점: capture 획득과 해제를 관리해야 한다.

### 방안 2. window 전역 pointer listener를 사용한다

드래그 시작 시 window에 `pointermove`, `pointerup`, `pointercancel` listener를 붙이고, 종료 시 제거한다.

- 장점: 커서가 마커 DOM 밖으로 벗어나도 이벤트를 받을 수 있다.
- 장점: pointer capture를 지원하지 않는 환경까지 고려할 수 있다.
- 단점: 전역 listener 등록/해제 코드가 필요하다.
- 단점: 컴포넌트 언마운트 정리가 필요하다.

## 해결 1. pointer capture를 먼저 사용한다

처음에는 방안 1인 pointer capture를 사용했다.
`setPointerCapture`는 포인터가 요소 밖으로 나가도 이후 pointer 이벤트를 해당 요소가 계속 받게 해주므로, 문제 1에는 적절한 해결책처럼 보였다.

## 문제 2. 리렌더링으로 capture 대상 DOM이 안정적이지 않다

pointer capture 적용 후에도 빠르게 웨이포인트를 드래그하고 마우스를 놓으면 이동 확정이 누락되는 문제가 있었다.

드래그 중에는 `onWaypointMoveUpdate`가 계속 호출되고, 이로 인해 React 상태가 갱신된다.
마커 오버레이의 `position`이 바뀌면서 렌더링이 반복되고, 상황에 따라 pointer capture를 잡았던 기존 DOM이 사라지고 새 DOM이 생길 수 있다.

이 경우 capture를 잡았던 DOM과 현재 화면에 있는 DOM이 달라진다.
마우스를 빠르게 놓아 새 DOM 위에서 `pointerup`이 발생하지 않으면, 마커 DOM에 걸어둔 `onPointerUp` 핸들러가 호출되지 않고 `commit`이 실행되지 않을 수 있다.

## 문제 2의 방안

### 방안 1. window 전역 pointer listener로 변경한다

`pointerdown`이 웨이포인트에서 시작되면 window에 `pointermove`, `pointerup`, `pointercancel` listener를 등록하고, 종료 시 제거한다.

- 장점: 커서가 마커 DOM 밖으로 벗어나도 이벤트를 받을 수 있다.
- 장점: 드래그 중 마커 DOM이 리렌더링되어 교체되어도 `pointermove`와 `pointerup`을 계속 처리할 수 있다.
- 단점: 전역 listener 등록/해제 코드가 필요하다.
- 단점: 컴포넌트 언마운트 시 정리 규칙이 필요하다.

## 해결 2. window 전역 pointer listener로 변경한다

최종적으로 방안 2를 사용한다.

pointer capture는 문제 1에는 맞는 해결책이었지만, 드래그 중 상태 업데이트로 마커 DOM이 계속 갱신되는 구조에서는 capture 대상 DOM이 유지되지 않는다.
따라서 window 전역 pointer listener 방식으로 변경한다.

이 방식은 전역 listener 정리 규칙이 필요하다는 단점이 있지만, 마우스 커서가 마커 DOM 밖으로 벗어나거나 마커 DOM이 리렌더링되어 교체되어도 이동 갱신과 확정 로직을 안정적으로 실행할 수 있다.
