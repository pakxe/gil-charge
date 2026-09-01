import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const axios = require("axios");
const config = require("../config");
const localCurrencyCacheRepository = require("../repositories/localCurrencyCacheRepository");
const jusoAddressService = require("./jusoAddressService");
const opinetService = require("./opinetService");
const localCurrencyService = require("./localCurrencyService");

const originalLocalCurrencyApiKey = config.GYEONGGI_LOCAL_CURRENCY_API_KEY;

describe("localCurrencyService", () => {
    beforeEach(() => {
        config.GYEONGGI_LOCAL_CURRENCY_API_KEY = "test-key";
        vi.spyOn(localCurrencyCacheRepository, "findByStationUids").mockResolvedValue([]);
        vi.spyOn(localCurrencyCacheRepository, "upsertCache").mockImplementation(async (cache) => cache);
        vi.spyOn(jusoAddressService, "standardizeRoadAddress").mockImplementation(async (roadAddress) => ({
            roadAddress,
            raw: null,
            source: "fallback",
        }));
    });

    afterEach(() => {
        config.GYEONGGI_LOCAL_CURRENCY_API_KEY = originalLocalCurrencyApiKey;
        vi.restoreAllMocks();
    });

    it("유효한 캐시는 외부 API를 호출하지 않고 재사용한다", async () => {
        const cachedRow = createCache({
            lookupStatus: "ACCEPTED",
            isLocalCurrencyAccepted: true,
            localCurrencyExpiresAt: new Date(Date.now() + 60_000),
        });
        localCurrencyCacheRepository.findByStationUids.mockResolvedValue([cachedRow]);
        const detailSpy = vi.spyOn(opinetService, "fetchStationDetailById");

        const [station] = await localCurrencyService.attachLocalCurrencyInfo([createStation()]);

        expect(station.localCurrency).toMatchObject({ accepted: true, status: "ACCEPTED" });
        expect(detailSpy).not.toHaveBeenCalled();
        expect(localCurrencyCacheRepository.upsertCache).not.toHaveBeenCalled();
    });

    it("경기도 밖 주유소는 지역화폐 API 호출 없이 OUT_OF_SCOPE으로 저장한다", async () => {
        mockStationDetail({ NEW_ADR: "서울특별시 동작구 보라매로 1" });
        const axiosSpy = vi.spyOn(axios, "get");

        const [station] = await localCurrencyService.attachLocalCurrencyInfo([createStation()]);

        expect(station.localCurrency).toMatchObject({ accepted: null, status: "OUT_OF_SCOPE" });
        expect(axiosSpy).not.toHaveBeenCalled();
        expect(localCurrencyCacheRepository.upsertCache).toHaveBeenCalledWith(
            expect.objectContaining({ lookupStatus: "OUT_OF_SCOPE" }),
        );
    });

    it("경기도 지역화폐 가맹 주유소를 ACCEPTED로 저장한다", async () => {
        mockStationDetail({ NEW_ADR: "경기도 수원시 팔달구 효원로 1" });
        vi.spyOn(axios, "get").mockResolvedValue({
            data: {
                RegionMnyFacltStus: [
                    { head: [] },
                    {
                        row: [
                            {
                                INDUTYPE_CD: "6601",
                                CMPNM_NM: "테스트 주유소",
                                REGION_MNY_NM: "수원페이",
                            },
                        ],
                    },
                ],
            },
        });

        const [station] = await localCurrencyService.attachLocalCurrencyInfo([createStation()]);

        expect(station.localCurrency).toMatchObject({
            accepted: true,
            status: "ACCEPTED",
            storeName: "테스트 주유소",
            currencyName: "수원페이",
            industryCode: "6601",
        });
        expect(localCurrencyCacheRepository.upsertCache).toHaveBeenCalledWith(
            expect.objectContaining({ lookupStatus: "ACCEPTED", isLocalCurrencyAccepted: true }),
        );
    });

    it("지역화폐 API 오류는 전체 검색을 실패시키지 않고 ERROR 상태로 저장한다", async () => {
        mockStationDetail({ NEW_ADR: "경기도 수원시 팔달구 효원로 1" });
        vi.spyOn(axios, "get").mockRejectedValue(new Error("upstream failed"));
        vi.spyOn(console, "error").mockImplementation(() => {});

        const [station] = await localCurrencyService.attachLocalCurrencyInfo([createStation()]);

        expect(station.localCurrency).toMatchObject({ accepted: null, status: "ERROR" });
        expect(localCurrencyCacheRepository.upsertCache).toHaveBeenCalledWith(
            expect.objectContaining({
                lookupStatus: "ERROR",
                localCurrencyName: null,
                localCurrencyIndustryCode: null,
            }),
        );
    });
});

function createStation() {
    return { id: "station-1", name: "테스트 주유소", price: 1_700, lat: 37.2, lng: 127.1 };
}

function createCache(overrides = {}) {
    return {
        stationUid: "station-1",
        stationName: "테스트 주유소",
        roadAddress: "경기도 수원시 팔달구 효원로 1",
        lotAddress: null,
        sigunName: "수원시",
        isLocalCurrencyAccepted: null,
        lookupStatus: "UNKNOWN",
        opinetDetailCheckedAt: new Date(),
        localCurrencyCheckedAt: new Date(),
        localCurrencyExpiresAt: new Date(),
        localCurrencyStoreName: null,
        localCurrencyName: null,
        localCurrencyIndustryCode: null,
        ...overrides,
    };
}

function mockStationDetail(oil) {
    vi.spyOn(opinetService, "fetchStationDetailById").mockResolvedValue({
        RESULT: { OIL: [{ OS_NM: "테스트 주유소", ...oil }] },
    });
}
