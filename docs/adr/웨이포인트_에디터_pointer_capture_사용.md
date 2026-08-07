# 웨이포인트 에디터 pointer capture 사용

- 상태: 제안
- 작성일: 2026-08-06

## 문제 상황

웨이포인트 마커를 드래그하는 중 마우스 커서가 마커 DOM 영역 밖으로 벗어나면, 이후 `pointermove` 또는 `pointerup` 이벤트를 마커가 받지 못할 수 있다.

이 경우 다음 문제가 생긴다.

- 드래그 중 위치 갱신이 끊긴다.
- `pointerup`을 놓치면 이동 확정이 실행되지 않을 수 있다.
- `startPosRef`, `isDraggingRef` 같은 gesture 상태가 의도한 시점에 정리되지 않을 수 있다.

## 방안

### 방안 1. pointer capture를 사용한다

`pointerdown`에서 `setPointerCapture(event.pointerId)`를 호출하고, `pointerup` 또는 `pointercancel`에서 capture를 해제한다.

- 장점: 커서가 마커 DOM 밖으로 벗어나도 같은 마커가 `pointermove`와 `pointerup`을 계속 받을 수 있다. (event.currentTarget.setPointerCapture(event.pointerId)를 호출하면, 포인터가 요소 밖으로 나가더라도 pointerup이 일어날 때까지 모든 포인터 이벤트를 해당 요소로 강제 고정(Capture)시킨다.)
- 장점: window 전역 이벤트 listener 없이 drag gesture를 마커 컴포넌트 안에 둘 수 있다.
- 단점: capture 획득과 해제를 관리해야 한다.

### 방안 2. window 전역 pointer listener를 사용한다

드래그 시작 시 window에 `pointermove`, `pointerup`, `pointercancel` listener를 붙이고, 종료 시 제거한다.

- 장점: 커서가 마커 DOM 밖으로 벗어나도 이벤트를 받을 수 있다.
- 장점: pointer capture를 지원하지 않는 환경까지 고려할 수 있다.
- 단점: 전역 listener 등록/해제 코드가 필요하다.
- 단점: 컴포넌트 언마운트 정리가 필요하다.

## 판단

방안1 사용한다.

pointer capture는 복잡도를 조금 늘리지만, 전역 listener보다 책임 범위가 좁고 마커 컴포넌트 안에서 gesture를 안정적으로 처리할 수 있다.
