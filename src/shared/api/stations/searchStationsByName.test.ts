import { AxiosResponse } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpFailure } from "../httpFailure";
import { httpClient } from "../httpClient";
import { searchStationsByName, type StationNameSearchResult } from "./searchStationsByName";

describe("searchStationsByName", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("주유소 이름 검색 결과를 반환한다", async () => {
        const stations = [createStationNameSearchResult()];
        vi.spyOn(httpClient, "get").mockResolvedValue(createAxiosResponse({ stations }));

        await expect(searchStationsByName({ osnm: "보라매", area: "01" })).resolves.toEqual(stations);
    });

    it("응답 body가 기대 형식이 아니면 INVALID_RESPONSE를 던진다", async () => {
        vi.spyOn(httpClient, "get").mockResolvedValue(createAxiosResponse({ items: [] }));

        await expect(searchStationsByName({ osnm: "보라매" })).rejects.toMatchObject({
            code: "INVALID_RESPONSE",
        });
    });

    it("HTTP_ERROR의 백엔드 에러 응답을 RequestFailure로 변환한다", async () => {
        vi.spyOn(httpClient, "get").mockRejectedValue(
            createHttpFailure("HTTP_ERROR", {
                status: 400,
                data: {
                    code: "INVALID_INPUT",
                    message: "입력값을 확인해주세요.",
                },
            }),
        );

        await expect(searchStationsByName({ osnm: "보라매" })).rejects.toMatchObject({
            code: "INVALID_INPUT",
            status: 400,
            message: "입력값을 확인해주세요.",
        });
    });

    it("PAYLOAD_TOO_LARGE 백엔드 에러 응답을 RequestFailure로 변환한다", async () => {
        vi.spyOn(httpClient, "get").mockRejectedValue(
            createHttpFailure("HTTP_ERROR", {
                status: 413,
                data: {
                    code: "PAYLOAD_TOO_LARGE",
                    message: "요청 데이터가 너무 큽니다.",
                },
            }),
        );

        await expect(searchStationsByName({ osnm: "보라매" })).rejects.toMatchObject({
            code: "PAYLOAD_TOO_LARGE",
            status: 413,
            message: "요청 데이터가 너무 큽니다.",
        });
    });

    it("HTTP_ERROR의 body가 백엔드 에러 응답 형식이 아니면 INVALID_RESPONSE를 던진다", async () => {
        vi.spyOn(httpClient, "get").mockRejectedValue(
            createHttpFailure("HTTP_ERROR", {
                status: 500,
                data: {
                    error: "Internal Server Error",
                },
            }),
        );

        await expect(searchStationsByName({ osnm: "보라매" })).rejects.toMatchObject({
            code: "INVALID_RESPONSE",
            status: 500,
        });
    });

    it("AbortSignal과 query params를 axios config로 전달한다", async () => {
        const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(createAxiosResponse({ stations: [] }));
        const signal = new AbortController().signal;

        await searchStationsByName({ osnm: "보라매", area: "01", signal });

        expect(getSpy).toHaveBeenCalledWith("/stations/name", {
            params: {
                osnm: "보라매",
                area: "01",
            },
            signal,
        });
    });
});

function createStationNameSearchResult(): StationNameSearchResult {
    return {
        id: "A0001145",
        name: "대양석유(주)직영 보라매주유소",
        brand: "SKE",
        chargingStationBrand: null,
        lotAddress: "서울 관악구 봉천동 729-4",
        roadAddress: "서울 관악구  보라매로 26 (봉천동)",
        sigunCode: "0117",
        lpgYn: "N",
        gis: {
            x: 305321.3685,
            y: 543824.2418,
            coordinateSystem: "KATEC",
        },
        lat: 37.49172112762502,
        lng: 126.92672469000718,
    };
}

function createAxiosResponse(data: unknown) {
    return { data } as AxiosResponse;
}
