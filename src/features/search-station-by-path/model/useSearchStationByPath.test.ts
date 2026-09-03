// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    searchStationByPath,
    type SearchStationByPathParams,
} from "@/features/search-station-by-path/api/searchStationByPath";
import { useSearchStationByPath } from "@/features/search-station-by-path/model/useSearchStationByPath";
import { createRequestFailure } from "@/shared/lib/requestFailure";
import type { PathSet, Station } from "@/shared/model/map";

vi.mock("@/features/search-station-by-path/api/searchStationByPath", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/features/search-station-by-path/api/searchStationByPath")>();

    return {
        ...actual,
        searchStationByPath: vi.fn(),
    };
});

const searchStationByPathMock = vi.mocked(searchStationByPath);

afterEach(() => {
    cleanup();
    searchStationByPathMock.mockReset();
});

describe("useSearchStationByPath request lifecycle", () => {
    it("B 요청을 시작하면 진행 중인 A 요청을 abort한다", async () => {
        const requestA = createDeferred<Station[]>();
        const requestB = createDeferred<Station[]>();

        searchStationByPathMock
            .mockImplementationOnce(() => requestA.promise)
            .mockImplementationOnce(() => requestB.promise);

        const { result } = renderHook(() => useSearchStationByPath());

        let searchA!: Promise<void>;

        act(() => {
            searchA = result.current.search([createPath("path-a")], 1);
        });

        const signalA = getRequest(0).signal;
        expect(signalA?.aborted).toBe(false);

        let searchB!: Promise<void>;

        act(() => {
            searchB = result.current.search([createPath("path-b")], 2);
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
        const requestA = createDeferred<Station[]>();
        const requestB = createDeferred<Station[]>();
        const stationA = createStation("station-a");
        const stationB = createStation("station-b");

        searchStationByPathMock
            .mockImplementationOnce(() => requestA.promise)
            .mockImplementationOnce(() => requestB.promise);

        const { result } = renderHook(() => useSearchStationByPath());

        let searchA!: Promise<void>;
        let searchB!: Promise<void>;

        act(() => {
            searchA = result.current.search([createPath("path-a")], 1);
            searchB = result.current.search([createPath("path-b")], 2);
        });

        await act(async () => {
            requestB.resolve([stationB]);
            await searchB;
        });

        expect(result.current.state).toMatchObject({
            status: "success",
            stations: [stationB],
        });

        await act(async () => {
            requestA.resolve([stationA]);
            await searchA;
        });

        expect(result.current.state).toMatchObject({
            status: "success",
            stations: [stationB],
        });
    });

    it("retry는 가장 최근 실패 당시의 경로와 반경을 그대로 사용한다", async () => {
        const paths = [createPath("path-a")];

        searchStationByPathMock.mockRejectedValueOnce(createRequestFailure("TIMEOUT")).mockResolvedValueOnce([]);

        const { result } = renderHook(() => useSearchStationByPath());

        await act(async () => {
            await result.current.search(paths, 3);
        });

        expect(result.current.state.status).toBe("error");

        act(() => {
            result.current.retry();
        });

        await waitFor(() => {
            expect(searchStationByPathMock).toHaveBeenCalledTimes(2);
            expect(result.current.state.status).toBe("success");
        });

        expect(getRequest(1)).toMatchObject({
            paths,
            radiusKm: 3,
        });
    });

    it("실패 코드에 따라 복구 정책을 결정한다", async () => {
        const cases = [
            {
                failure: createRequestFailure("INVALID_INPUT", { message: "입력값을 확인해주세요." }),
                expectedPolicy: { presentation: "inline", recovery: "edit-input", report: "none" },
            },
            {
                failure: createRequestFailure("TIMEOUT"),
                expectedPolicy: { presentation: "toast", recovery: "manual-retry", report: "always" },
            },
            {
                failure: createRequestFailure("INVALID_RESPONSE"),
                expectedPolicy: { presentation: "toast", recovery: "none", report: "always" },
            },
        ];

        for (const { failure, expectedPolicy } of cases) {
            searchStationByPathMock.mockRejectedValueOnce(failure);

            const { result, unmount } = renderHook(() => useSearchStationByPath());

            await act(async () => {
                await result.current.search([createPath("path-a")], 3);
            });

            expect(result.current.state).toMatchObject({
                status: "error",
                failure,
                policy: expectedPolicy,
            });

            unmount();
        }
    });

    it("unmount 시 진행 중인 요청을 abort한다", () => {
        const request = createDeferred<Station[]>();

        searchStationByPathMock.mockImplementationOnce(() => request.promise);

        const { result, unmount } = renderHook(() => useSearchStationByPath());

        act(() => {
            void result.current.search([createPath("path-a")], 3);
        });

        const signal = getRequest(0).signal;
        expect(signal?.aborted).toBe(false);

        unmount();

        expect(signal?.aborted).toBe(true);
    });
});

function getRequest(index: number): SearchStationByPathParams {
    const request = searchStationByPathMock.mock.calls[index]?.[0];

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

    return {
        promise,
        reject,
        resolve,
    };
}

function createPath(id: string): PathSet {
    return {
        id,
        type: "waypoint",
        points: [{ lat: 37.5665, lng: 126.978 }],
    };
}

function createStation(id: string): Station {
    return {
        id,
        name: `${id} 주유소`,
        price: 1_700,
        brandCode: "SKE",
        lat: 37.5665,
        lng: 126.978,
        localCurrency: {
            accepted: null,
            status: "UNKNOWN",
        },
    };
}
