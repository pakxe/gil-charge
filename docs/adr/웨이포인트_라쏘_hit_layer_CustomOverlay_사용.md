# 웨이포인트 라쏘 hit layer 렌더링 방식

- 상태: 채택
- 작성일: 2026-08-12

## 문제

라쏘 선택 모드에서는 빈 지도 영역에서 pointer drag를 시작하면 라쏘 polygon을 그리고, 웨이포인트 마커 위에서 시작한 pointer는 마커 선택/이동 동작으로 처리되어야 한다.

처음에는 지도 컨테이너에 native `pointerdown` listener를 붙이고, 이벤트 시작 지점이 웨이포인트 마커인지 `data-waypoint-node` custom data attribute로 판별했다.
이 방식은 동작은 단순하지만 라쏘 레이어가 웨이포인트 DOM의 구체적인 식별자에 의존한다.
도메인 컴포넌트 간 계약이 DOM selector 문자열로 숨어 있으므로 유지보수성이 낮다.

이후 투명한 라쏘 hit layer를 지도 컨테이너에 직접 append하는 방식을 시도했다.
하지만 Kakao 지도 DOM에서 웨이포인트 마커는 `CustomOverlay` 내부 pane에 렌더링되고, 직접 append한 hit layer는 map container의 direct child로 붙었다.
그 결과 `MAP_Z_INDEX.lasso < MAP_Z_INDEX.waypoint` 값이어도 서로 다른 stacking context에서 비교되어, hit layer가 마커를 덮고 마커 hover/drag를 가로채는 문제가 있었다.

Kakao 내부 overlay pane을 `querySelector`로 찾아 hit layer를 삽입하면 문제는 해결되지만, Kakao SDK의 비공개 DOM 구조와 inline style에 의존하게 된다.

## 방안

### 방안 1. DOM selector로 라쏘 시작 제외 대상을 판별한다

웨이포인트 루트 DOM에 `data-waypoint-node`를 붙이고, 라쏘 시작 시 `target.closest(...)`로 제외한다.

- 장점: 구현이 작다.
- 단점: 컴포넌트 의미가 custom data attribute와 selector 문자열에 묶인다.
- 단점: 라쏘 레이어가 웨이포인트 DOM 구조를 알아야 한다.

### 방안 2. 지도 컨테이너에 투명 hit layer를 직접 append한다

라쏘 모드에서 지도 컨테이너 위에 투명한 DOM layer를 만들고, 그 layer가 pointer gesture를 처리한다.

- 장점: 라쏘 시작 가능 표면이 별도 레이어로 분리된다.
- 단점: Kakao `CustomOverlay`와 같은 stacking context에 있지 않으면 마커를 덮을 수 있다.

### 방안 3. Kakao 내부 overlay pane을 찾아 hit layer를 삽입한다

Kakao가 만든 custom overlay pane을 DOM에서 찾아 그 안에 hit layer를 넣는다.

- 장점: 웨이포인트 마커와 같은 overlay 계층에서 z-index를 비교할 수 있다.
- 단점: Kakao SDK의 내부 DOM 구조와 inline style에 의존한다.

### 방안 4. 라쏘 hit surface를 `Map.CustomOverlay`로 렌더링한다

라쏘 hit surface 자체를 `Map.CustomOverlay`로 렌더링한다.
지도 컨테이너의 좌상단 client point를 `LatLng`로 변환해 overlay position으로 사용하고, `xAnchor={0}`, `yAnchor={0}`로 화면 전체 크기의 hit surface를 배치한다.

- 장점: 웨이포인트 마커와 라쏘 hit surface가 모두 지도 어댑터의 `CustomOverlay` 계층을 사용한다.
- 장점: `MAP_Z_INDEX.lasso`, `MAP_Z_INDEX.waypoint`, `MAP_Z_INDEX.selectedWaypoint`가 같은 overlay 시스템 안에서 비교된다.
- 장점: custom data attribute, DOM selector, Kakao 내부 pane 탐색이 필요 없다.
- 단점: 지도 컨테이너 크기와 좌상단 좌표를 별도로 계산해야 한다.

## 결정

방안 4를 사용한다.

라쏘 hit surface는 `WaypointLassoLayer` 안에서 `Map.CustomOverlay`로 렌더링한다.
`position`은 `map.getContainer().getBoundingClientRect()`의 좌상단을 `map.clientPointToLatLng(...)`로 변환한 값으로 둔다.
`xAnchor`와 `yAnchor`는 `0`으로 두어 overlay의 좌상단이 지도 컨테이너 좌상단과 맞도록 한다.
hit surface의 `width`와 `height`는 지도 컨테이너 크기를 사용하고, `ResizeObserver`로 컨테이너 크기 변경을 반영한다.

라쏘 gesture는 hit surface DOM의 React pointer handler에서 처리한다.
hit surface는 라쏘 모드 동안 안정적으로 유지되는 DOM이므로 `setPointerCapture`를 사용해도 된다.
웨이포인트 마커 이동에서 pointer capture를 피했던 이유는 이동 중 마커 overlay가 좌표 업데이트로 리렌더링될 수 있었기 때문이다.
라쏘 hit surface에는 같은 문제가 없다.

## 구현 규칙

- 웨이포인트 DOM에 라쏘 판별용 `data-*` attribute를 추가하지 않는다.
- 라쏘 시작 제외 대상을 `target.closest(...)` selector로 판별하지 않는다.
- Kakao SDK 내부 DOM 구조를 `querySelector`나 inline style 조건으로 찾지 않는다.
- 라쏘 hit surface와 웨이포인트 마커는 모두 `Map.CustomOverlay`를 통해 같은 지도 overlay 계층에 둔다.
- z-index는 `MAP_Z_INDEX.lasso < MAP_Z_INDEX.waypoint < MAP_Z_INDEX.selectedWaypoint` 관계를 유지한다.

## 결과

- 라쏘 시작 가능 영역이 별도 hit surface로 분리된다.
- 웨이포인트 마커 위 pointer event는 마커가 받고, 빈 지도 영역 pointer event는 라쏘 hit surface가 받는다.
- 라쏘 레이어가 웨이포인트 DOM 구조나 Kakao 내부 DOM 구조에 직접 의존하지 않는다.
