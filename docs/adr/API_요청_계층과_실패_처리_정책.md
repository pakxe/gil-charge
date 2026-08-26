# API 요청 계층과 실패 처리 정책

- 상태: 채택
- 작성일: 2026-08-24

## 배경

현재 API 요청 과정에서 HTTP 통신, 응답 검증, 요청 상태 관리, 사용자 오류 피드백의 책임 경계가 명확하지 않다.

이 상태로 API와 오류 종류가 늘어나면 HTTP 구현 세부사항이 View까지 노출될 수 있다.
또한 같은 실패가 화면마다 다르게 처리되거나, 재시도, 취소, 오류 보고 로직이 여러 위치에 중복될 가능성이 있다.

따라서 API 요청 흐름을 계층으로 나누고, 각 계층의 책임과 의존성 방향을 명확히 정의한다.

## 결정 1. API 요청 책임은 HTTP -> Request -> Controller -> View 계층으로 나눈다

계층은 HTTP, Request, Controller, View 순서로 쌓는다.
사용자 이벤트에서 시작되는 런타임 호출 방향은 아래와 같다.

```text
View(Component)
  -> Controller(Hook)
    -> Request(API function)
      -> HTTP(Client)
        -> Backend API
```

의존성은 View에서 HTTP 방향으로만 흐른다.
하위 계층은 상위 계층을 알지 않는다.

```text
View -> Controller -> Request -> HTTP
```

각 계층은 자신의 바로 아래 계층만 사용한다.
특히 View는 `fetch`, `axios`, `httpClient`, HTTP status, 원본 네트워크 오류를 직접 다루지 않는다.

## 결정 2. HTTP layer는 HTTP 구현과 공통 정책만 책임진다

HTTP layer의 책임은 다음으로 제한한다.

- HTTP 통신 주체를 한 곳에 둔다.
- `baseURL`, 공통 timeout, 공통 header 같은 HTTP 정책을 정의한다.
- `fetch`, `axios` 같은 HTTP 라이브러리 선택을 감춘다.
- 원본 HTTP 오류와 네트워크 오류를 정규화된 `HttpFailure`로 변환한다.
- HTTP status와 response body는 보존하되, 앱 실패 코드로 해석하지 않는다.

HTTP layer는 API별 method, url, request DTO, response DTO, API별 backend app error code, 화면 상태, 사용자 메시지, 재시도 UI를 알지 않는다.

## 결정 3. Request layer는 API 계약과 응답 검증을 책임진다

Request layer의 책임은 다음이다.

- API별 HTTP method, url, path params, query params, body를 결정한다.
- 요청 DTO 타입을 정의한다.
- 응답 DTO 타입을 정의한다.
- 응답 body를 런타임에 검증한다.
- `HttpFailure`와 응답 검증 실패를 해당 API의 실패 모델로 변환한다.
- API별 backend error response의 기본 형태를 검증하고 앱 실패 코드로 해석한다.
- `AbortSignal`처럼 요청 생애주기에 필요한 입력은 받되, 생애주기 자체는 관리하지 않는다.

Request layer는 loading, success, error 같은 화면 상태를 관리하지 않는다.
또한 toast, alert, inline error, retry button 같은 UI 표현을 결정하지 않는다.

## 결정 4. Controller layer는 비동기 요청과 화면 사이의 상태를 책임진다

Controller layer는 hook 같은 형태로 구현하며, 화면과 비동기 요청 사이의 연결을 담당한다.

Controller layer의 책임은 다음이다.

- `idle`, `loading`, `success`, `error` 같은 요청 상태를 관리한다.
- 컴포넌트 unmount 또는 새 요청 시작 시 이전 요청을 취소한다.
- 같은 요청의 중복 실행을 방지한다.
- 늦게 도착한 응답이 최신 상태를 덮어쓰지 않도록 race condition을 방지한다.
- 실패한 요청의 입력을 보관한다.
- retry 함수를 제공한다.
- 실패 종류에 따른 사용자 표현 방식과 복구 방법을 결정한다.
- 새 요청을 기다리는 동안에는 기존 결과를 유지할 수 있지만, 요청 실패가 확정되면 기존 결과를 제거한다.

재시도는 HTTP layer나 Request layer에서 자동으로 수행하지 않는다.
사용자가 다시 시도할 수 있는 실패에 대해 Controller layer가 retry 함수를 노출하고, View가 이를 버튼이나 액션으로 렌더링한다.

## 결정 5. View layer는 렌더링과 사용자 이벤트 전달만 책임진다

View layer의 책임은 다음이다.

- HTML 구조와 style을 정의한다.
- 사용자 이벤트를 Controller layer에 전달한다.
- Controller layer가 제공한 상태에 따라 loading, 실패, 결과를 렌더링한다.
- Controller layer가 제공한 retry 함수를 재시도 버튼이나 액션에 연결한다.

View layer는 API 요청을 직접 실행하지 않는다.
또한 실패 코드를 기준으로 HTTP 수준의 분기를 직접 수행하지 않는다.

## 결정 6.

실패 피드백 정책은 다음과 같이 정한다.

| code                    | 표현             | 재시도 | 사용자 메시지                        | 복구 방법                             |
| ----------------------- | ---------------- | ------ | ------------------------------------ | ------------------------------------- |
| `INVALID_INPUT`         | inline           | 불가   | `입력값을 확인해주세요.`             | 사용자가 입력값을 수정한다.           |
| `PAYLOAD_TOO_LARGE`     | inline           | 불가   | `입력값을 확인해주세요.`             | 사용자가 요청 범위나 입력량을 줄인다. |
| `ROUTE_NOT_FOUND`       | alert            | 불가   | `요청을 처리할 수 없습니다.`         | 사용자가 직접 복구할 수 없다.         |
| `METHOD_NOT_ALLOWED`    | alert            | 불가   | `요청을 처리할 수 없습니다.`         | 사용자가 직접 복구할 수 없다.         |
| `INVALID_RESPONSE`      | alert            | 불가   | `요청을 처리할 수 없습니다.`         | 사용자가 직접 복구할 수 없다.         |
| `OPINET_UNAVAILABLE`    | alert 또는 toast | 가능   | `요청이 실패했습니다.`               | 다시 시도한다.                        |
| `DATABASE_UNAVAILABLE`  | alert 또는 toast | 가능   | `요청이 실패했습니다.`               | 다시 시도한다.                        |
| `INTERNAL_SERVER_ERROR` | alert 또는 toast | 가능   | `요청이 실패했습니다.`               | 다시 시도한다.                        |
| `CONFIGURATION_ERROR`   | alert 또는 toast | 불가   | `예상하지 못한 문제가 발생했습니다.` | 사용자가 직접 복구할 수 없다.         |
| `UNKNOWN_ERROR`         | alert 또는 toast | 불가   | `예상하지 못한 문제가 발생했습니다.` | 사용자가 직접 복구할 수 없다.         |
| `OFFLINE`               | alert            | 가능   | `인터넷 연결을 확인해주세요.`        | 연결 상태를 확인한 뒤 다시 시도한다.  |
| `NETWORK_ERROR`         | alert            | 가능   | `일시적으로 문제가 발생했습니다.`    | 다시 시도한다.                        |
| `TIMEOUT`               | alert            | 가능   | `일시적으로 문제가 발생했습니다.`    | 다시 시도한다.                        |
| `REQUEST_CANCELED`      | silent           | 불가   | 없음                                 | 사용자에게 표시하지 않는다.           |

`alert`는 브라우저 기본 `window.alert`를 의미하지 않는다.
화면 수준에서 사용자가 인지해야 하는 오류 표현을 의미하며, 화면 맥락에 따라 dialog, banner, toast 중 적절한 컴포넌트를 사용할 수 있다.

## 결과

- HTTP 구현 세부사항이 View까지 노출되지 않는다.
- API별 요청 계약과 응답 검증 위치가 Request layer로 모인다.
- 요청 상태, 취소, race condition, retry 로직이 Controller layer로 모인다.
- 사용자 오류 피드백은 실패 코드 기준으로 일관되게 결정된다.
- 새 API나 새 실패 코드를 추가할 때 책임 위치와 검토 항목이 명확해진다.

## 감수할 점

- API마다 request DTO, response DTO, 런타임 검증 코드가 필요하다.
- 단순 화면에서도 Controller layer를 거치므로 초기 구현량이 조금 늘어난다.
- 실패 코드 추가 시 사용자 경험과 복구 정책까지 함께 갱신해야 한다.
