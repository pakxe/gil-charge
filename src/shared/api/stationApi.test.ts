import { AxiosResponse } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpFailure } from "./httpFailure";
import { httpClient } from "./httpClient";
import { searchStationsByPath } from "./stationApi";

import { PathSet, Station } from "@/shared/types/map";

describe("stationApi", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("주유소 경로 검색 결과를 반환한다", async () => {
        const stations = [createStation()];
        vi.spyOn(httpClient, "post").mockResolvedValue(createAxiosResponse({ stations }));

        await expect(searchStationsByPath({ paths: [createPath()], radiusKm: 3 })).resolves.toEqual(stations);
    });

    it("응답 body가 기대 형식이 아니면 INVALID_RESPONSE를 던진다", async () => {
        vi.spyOn(httpClient, "post").mockResolvedValue(createAxiosResponse({ items: [] }));

        await expect(searchStationsByPath({ paths: [createPath()], radiusKm: 3 })).rejects.toMatchObject({
            code: "INVALID_RESPONSE",
        });
    });

    it("HTTP_ERROR의 백엔드 에러 응답을 RequestFailure로 변환한다", async () => {
        vi.spyOn(httpClient, "post").mockRejectedValue(
            createHttpFailure("HTTP_ERROR", {
                status: 400,
                data: {
                    code: "INVALID_INPUT",
                    message: "입력값을 확인해주세요.",
                },
            }),
        );

        await expect(searchStationsByPath({ paths: [createPath()], radiusKm: 3 })).rejects.toMatchObject({
            code: "INVALID_INPUT",
            status: 400,
            message: "입력값을 확인해주세요.",
        });
    });

    it("HTTP_ERROR의 body가 백엔드 에러 응답 형식이 아니면 INVALID_RESPONSE를 던진다", async () => {
        vi.spyOn(httpClient, "post").mockRejectedValue(
            createHttpFailure("HTTP_ERROR", {
                status: 500,
                data: {
                    error: "Internal Server Error",
                },
            }),
        );

        await expect(searchStationsByPath({ paths: [createPath()], radiusKm: 3 })).rejects.toMatchObject({
            code: "INVALID_RESPONSE",
            status: 500,
        });
    });

    it("HttpFailure를 RequestFailure로 변환한다", async () => {
        vi.spyOn(httpClient, "post").mockRejectedValue(createHttpFailure("TIMEOUT"));

        await expect(searchStationsByPath({ paths: [createPath()], radiusKm: 3 })).rejects.toMatchObject({
            code: "TIMEOUT",
        });
    });

    it("AbortSignal을 axios config로 전달한다", async () => {
        const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(createAxiosResponse({ stations: [] }));
        const signal = new AbortController().signal;
        const paths = [createPath()];

        await searchStationsByPath({ paths, radiusKm: 3, signal });

        expect(postSpy).toHaveBeenCalledWith("/stations/path", { paths, radiusKm: 3 }, { signal });
    });
});

function createPath(): PathSet {
    return {
        id: "path-1",
        type: "pen",
        points: [{ lat: 37.5665, lng: 126.978 }],
    };
}

function createStation(): Station {
    return {
        id: "station-1",
        name: "테스트 주유소",
        price: 1_700,
        lat: 37.5665,
        lng: 126.978,
        localCurrency: {
            accepted: null,
            status: "UNKNOWN",
        },
    };
}

function createAxiosResponse(data: unknown) {
    return { data } as AxiosResponse;
}
