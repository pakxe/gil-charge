# FSD 기반 프론트엔드 구조

- 상태: 초안
- 작성일: 2026-08-06

## 배경

이 프로젝트는 기존에 빠르게 구현하면서 폴더 구조와 책임 경계가 흐려졌다.
이번에는 학습과 설계 역량 강화를 위해 프론트엔드 구조를 FSD 기준으로 다시 정리한다.

## 결정

프론트엔드 구조는 FSD를 기준으로 나눈다.

```text
src/
  app/ : 앱 초기화, 라우터, 전역 provider 등. 비즈니스 관련은 두지 않는다.
  pages/ : 라우트에 직접 연결되는 화면 단위. 여러 feature와 shared를 조합한다. 페이지 자체의 복잡한 상태 로직은 가급적 feature로 내린다.
  features/ : 사용자가 수행하는 구체적인 행동/기능 단위. 내부에는 ui, model, api, lib 정도만 둔다.
  shared/ : 특정 기능을 모르는 공통 코드. 공통 ui, api client, 지도 어댑터, 공통 타입, 순수 유틸을 둔다.
```

의존 방향은 상위 레이어에서 하위 레이어로만 흐르게 한다.

```text
app -> pages -> features -> shared
```

`widgets`, `entities`는 FSD에서 자주 쓰는 레이어지만, 현재 프로젝트에서는 아직 별도 레이어로 둘 만큼의 필요가 명확하지 않으므로 만들지 않는다.
나중에 여러 페이지에서 공유되는 큰 화면 블록이 생기면 `widgets`를 추가하고, 주유소나 경로처럼 여러 기능에서 공유되는 핵심 도메인 모델이 커지면 `entities`를 추가한다.

## Segment

slice 내부 segment는 우선 FSD에서 자주 쓰는 이름을 따른다.

```text
ui
model
api
lib
config
```

Custom hook, 타입, 상태 로직은 별도 `hooks`, `types` 폴더를 먼저 만들지 않고 역할에 따라 `model`, `ui`, `api`, `lib` 중 가까운 곳에 둔다.

현재 코드에 남아 있는 `components`, `hooks`, `utils`, `models` 폴더는 점진적으로 아래 기준에 맞춰 옮긴다.

- React 컴포넌트는 `ui`로 옮긴다.
- Custom hook과 상태 전이 로직은 `model`로 옮긴다.
- 순수 계산 함수와 기능 보조 함수는 `lib`로 옮긴다.
- API 요청 함수, DTO, 응답 schema는 `api`에 둔다.

공통 React 컴포넌트도 `shared/components`를 따로 두지 않고 `shared/ui`에 둔다.
`features` 내부 React 컴포넌트도 `components`를 따로 두지 않고 해당 slice의 `ui`에 둔다.

한 번에 전체 구조를 바꾸지 않고, import 변경 범위가 작은 단위로 이동한다.

## 배럴 패턴

이 프로젝트에서는 배럴 패턴을 사용하지 않는다.

```ts
// 사용하지 않는다
export * from "./ui/SomeComponent";
```

필요한 파일을 직접 import한다.

```ts
import { SomeComponent } from "@/features/some_feature/ui/SomeComponent";
```

## 메모

이 문서는 초안이다.
프로젝트에 FSD를 적용하면서 적절한 기준을 점진적으로 추가하거나 수정한다.
