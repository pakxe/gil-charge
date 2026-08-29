import { RequestFailure } from "@/shared/lib/requestFailure";

export function getSearchStationByPathFailureMessage(failure: RequestFailure) {
    switch (failure.code) {
        case "INVALID_INPUT":
        case "PAYLOAD_TOO_LARGE":
            return "입력값을 확인해주세요.";
        case "ROUTE_NOT_FOUND":
        case "METHOD_NOT_ALLOWED":
        case "INVALID_RESPONSE":
            return "요청을 처리할 수 없습니다.";
        case "OPINET_UNAVAILABLE":
        case "DATABASE_UNAVAILABLE":
        case "INTERNAL_SERVER_ERROR":
            return "요청이 실패했습니다.";
        case "OFFLINE":
            return "인터넷 연결을 확인해주세요.";
        case "NETWORK_ERROR":
        case "TIMEOUT":
            return "일시적으로 문제가 발생했습니다.";
        case "CONFIGURATION_ERROR":
        case "UNKNOWN_ERROR":
        default:
            return "예상하지 못한 문제가 발생했습니다.";
    }
}
