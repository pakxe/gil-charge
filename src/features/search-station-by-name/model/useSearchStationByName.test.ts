// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    searchStationByName,
    type SearchStationByNameParams,
    type SearchStationByNameResult,
} from "@/features/search-station-by-name/api/searchStationByName";
import { createRequestFailure } from "@/shared/lib/requestFailure";
import { useSearchStationByName, validateSearchStationByNameInput } from "@/features/search-station-by-name/model/useSearchStationByName";

vi.mock("@/features/search-station-by-name/api/searchStationByName", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/features/search-station-by-name/api/searchStationByName")>();

    return {
        ...actual,
        searchStationByName: vi.fn(),
    };
});

const searchStationByNameMock = vi.mocked(searchStationByName);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("validateSearchStationByNameInput", () => {
    it("빈 문자열과 공백 문자열은 유효하지 않다", () => {
        expect(validateSearchStationByNameInput("")).toMatchObject({
            isValid: false,
            inlineFailure: {
                message: "주유소명을 2자 이상 입력해주세요.",
            },
        });
        expect(validateSearchStationByNameInput("   ")).toMatchObject({
            isValid: false,
            inlineFailure: {
                message: "주유소명을 2자 이상 입력해주세요.",
            },
        });
    });

    it("1자는 유효하지 않다", () => {
        expect(validateSearchStationByNameInput("보")).toMatchObject({
            isValid: false,
            inlineFailure: {
                message: "주유소명을 2자 이상 입력해주세요.",
            },
        });
    });

    it("2자 이상 30자 이하는 trim된 요청값으로 유효하다", () => {
        expect(validateSearchStationByNameInput(" 보라매 ")).toEqual({
            isValid: true,
            osnm: "보라매",
            inlineFailure: null,
        });
        expect(validateSearchStationByNameInput("가".repeat(30))).toEqual({
            isValid: true,
            osnm: "가".repeat(30),
            inlineFailure: null,
        });
    });

    it("31자 이상은 유효하지 않다", () => {
        expect(validateSearchStationByNameInput("가".repeat(31))).toMatchObject({
            isValid: false,
            inlineFailure: {
                message: "주유소명을 30자 이하로 입력해주세요.",
            },
        });
    });
});

describe("useSearchStationByName request lifecycle", () => {
    it("B 요청을 시작하면 진행 중인 A 요청을 abort한다", async () => {
        const requestA = createDeferred<SearchStationByNameResult[]>();
        const requestB = createDeferred<SearchStationByNameResult[]>();
        searchStationByNameMock.mockImplementationOnce(() => requestA.promise).mockImplementationOnce(() => requestB.promise);

        const { result } = renderHook(() => useSearchStationByName());

        let searchA!: Promise<void>;
        act(() => {
            searchA = result.current.search("검색A");
        });

        const signalA = getRequest(0).signal;
        expect(signalA?.aborted).toBe(false);

        let searchB!: Promise<void>;
        act(() => {
            searchB = result.current.search("검색B");
        });

        expect(signalA?.aborted).toBe(true);
        expect(getRequest(1).signal?.aborted).toBe(false);

        await act(async () => {
            requestB.resolve([]);
            requestA.resolve([]);
            await Promise.all([searchA, searchB]);
        });
    });

    it("늦게 도착한 A 성공 결과가 먼저 완료된 B 결과를 덮어쓰지 않는다", async () => {
        const requestA = createDeferred<SearchStationByNameResult[]>();
        const requestB = createDeferred<SearchStationByNameResult[]>();
        const stationA = createStation("station-a", "A 주유소");
        const stationB = createStation("station-b", "B 주유소");
        searchStationByNameMock.mockImplementationOnce(() => requestA.promise).mockImplementationOnce(() => requestB.promise);

        const { result } = renderHook(() => useSearchStationByName());

        let searchA!: Promise<void>;
        let searchB!: Promise<void>;
        act(() => {
            searchA = result.current.search("검색A");
            searchB = result.current.search("검색B");
        });

        await act(async () => {
            requestB.resolve([stationB]);
            await searchB;
        });
        expect(result.current.state).toMatchObject({ status: "success", stations: [stationB] });

        await act(async () => {
            requestA.resolve([stationA]);
            await searchA;
        });
        expect(result.current.state).toMatchObject({ status: "success", stations: [stationB] });
    });

    it("늦게 도착한 A 실패가 먼저 완료된 B 성공 상태를 덮어쓰지 않는다", async () => {
        const requestA = createDeferred<SearchStationByNameResult[]>();
        const requestB = createDeferred<SearchStationByNameResult[]>();
        const stationB = createStation("station-b", "B 주유소");
        searchStationByNameMock.mockImplementationOnce(() => requestA.promise).mockImplementationOnce(() => requestB.promise);

        const { result } = renderHook(() => useSearchStationByName());

        let searchA!: Promise<void>;
        let searchB!: Promise<void>;
        act(() => {
            searchA = result.current.search("검색A");
            searchB = result.current.search("검색B");
        });

        await act(async () => {
            requestB.resolve([stationB]);
            await searchB;
        });

        await act(async () => {
            requestA.reject(createRequestFailure("TIMEOUT"));
            await searchA;
        });

        expect(result.current.state).toMatchObject({ status: "success", stations: [stationB] });
        expect(result.current.inlineFailure).toBeNull();
    });

    it("unmount 시 진행 중인 요청을 abort한다", () => {
        const request = createDeferred<SearchStationByNameResult[]>();
        searchStationByNameMock.mockImplementationOnce(() => request.promise);

        const { result, unmount } = renderHook(() => useSearchStationByName());

        act(() => {
            void result.current.search("검색어");
        });

        const signal = getRequest(0).signal;
        expect(signal?.aborted).toBe(false);

        unmount();

        expect(signal?.aborted).toBe(true);
    });

    it("취소된 A 요청은 error 상태와 retry 입력을 만들지 않는다", async () => {
        const requestA = createAbortableRequest();
        const stationB = createStation("station-b", "B 주유소");
        searchStationByNameMock
            .mockImplementationOnce(({ signal }) => requestA.start(signal))
            .mockResolvedValueOnce([stationB]);

        const { result } = renderHook(() => useSearchStationByName());

        let searchA!: Promise<void>;
        act(() => {
            searchA = result.current.search("취소A");
        });

        await act(async () => {
            await result.current.search("성공B");
            await searchA;
        });

        expect(result.current.state).toMatchObject({ status: "success", stations: [stationB] });
        expect(result.current.inlineFailure).toBeNull();

        act(() => {
            result.current.retry();
        });
        expect(searchStationByNameMock).toHaveBeenCalledTimes(2);
    });

    it("retry는 가장 최근 실패 당시의 입력을 그대로 사용한다", async () => {
        searchStationByNameMock
            .mockRejectedValueOnce(createRequestFailure("TIMEOUT"))
            .mockResolvedValueOnce([]);

        const { result } = renderHook(() => useSearchStationByName());

        await act(async () => {
            await result.current.search("  보라매  ", "01");
        });
        expect(result.current.state.status).toBe("error");

        act(() => {
            result.current.retry();
        });

        await waitFor(() => {
            expect(searchStationByNameMock).toHaveBeenCalledTimes(2);
            expect(result.current.state.status).toBe("success");
        });
        expect(getRequest(1)).toMatchObject({ osnm: "보라매", area: "01" });
    });
});

function getRequest(index: number): SearchStationByNameParams {
    const request = searchStationByNameMock.mock.calls[index]?.[0];

    if (!request) {
        throw new Error(`${index + 1}번째 검색 요청이 없습니다.`);
    }

    return request;
}

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, reject, resolve };
}

function createAbortableRequest() {
    return {
        start(signal?: AbortSignal) {
            return new Promise<SearchStationByNameResult[]>((_, reject) => {
                signal?.addEventListener(
                    "abort",
                    () => {
                        reject(createRequestFailure("REQUEST_CANCELED"));
                    },
                    { once: true },
                );
            });
        },
    };
}

function createStation(id: string, name: string): SearchStationByNameResult {
    return {
        id,
        name,
        brand: null,
        chargingStationBrand: null,
        lotAddress: null,
        roadAddress: null,
        sigunCode: null,
        lpgYn: null,
        gis: {
            x: 0,
            y: 0,
            coordinateSystem: "KATEC",
        },
        lat: 37.5665,
        lng: 126.978,
    };
}
