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
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

의존 방향은 상위 레이어에서 하위 레이어로만 흐르게 한다.

```text
app -> pages -> widgets -> features -> entities -> shared
```

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
