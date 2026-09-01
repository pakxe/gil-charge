const axios = require("axios");
const config = require("../config");
const localCurrencyCacheRepository = require("../repositories/localCurrencyCacheRepository");
const jusoAddressService = require("./jusoAddressService");
const opinetService = require("./opinetService");

const CACHE_REFRESH_MONTHS = 1;
const REFRESH_CONCURRENCY = 5;
const GAS_STATION_INDUSTRY_CODES = new Set(["6601", "2601", "13"]);

function addMonths(date, months) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
}

function isCacheFresh(cache, now = new Date()) {
    if (!cache || !cache.localCurrencyExpiresAt) {
        return false;
    }

    return new Date(cache.localCurrencyExpiresAt).getTime() > now.getTime();
}

function isGyeonggiAddress(address) {
    if (!address) {
        return false;
    }

    return address.includes("경기도") || address.startsWith("경기 ");
}

function extractSigunName(address) {
    if (!address) {
        return null;
    }

    const parts = address.trim().split(/\s+/);
    return parts.find((part) => part.endsWith("시") || part.endsWith("군")) || null;
}

function getOpinetDetailOil(detailResponse) {
    const oil = detailResponse?.RESULT?.OIL;

    if (Array.isArray(oil)) {
        return oil[0] || null;
    }

    return oil || null;
}

function extractGyeonggiRows(responseData) {
    const sections = responseData?.RegionMnyFacltStus;

    if (!Array.isArray(sections)) {
        return [];
    }

    const rowSection = sections.find((section) => Array.isArray(section.row));
    return rowSection?.row || [];
}

function getIndustryCode(row) {
    return String(row?.INDUTYPE_CD ?? "").trim();
}

function isGasStationIndustry(row) {
    return GAS_STATION_INDUSTRY_CODES.has(getIndustryCode(row));
}

async function mapWithConcurrency(items, concurrency, callback) {
    const results = [];
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await callback(items[currentIndex], currentIndex);
        }
    }

    const workerCount = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: workerCount }, worker));
    return results;
}

async function lookupLocalCurrencyByRoadAddress(roadAddress) {
    const checkedAt = new Date();
    const expiresAt = addMonths(checkedAt, CACHE_REFRESH_MONTHS);

    if (!config.GYEONGGI_LOCAL_CURRENCY_API_KEY) {
        return {
            isLocalCurrencyAccepted: null,
            lookupStatus: "UNKNOWN",
            localCurrencyCheckedAt: null,
            localCurrencyExpiresAt: null,
            localCurrencyStoreName: null,
            localCurrencyName: null,
            localCurrencyIndustryCode: null,
        };
    }

    const response = await axios.get(config.GYEONGGI_LOCAL_CURRENCY_API_URL, {
        params: {
            KEY: config.GYEONGGI_LOCAL_CURRENCY_API_KEY,
            Type: "json",
            pIndex: 1,
            pSize: 10,
            REFINE_ROADNM_ADDR: roadAddress,
        },
    });

    const rows = extractGyeonggiRows(response.data);
    const matchedStore = rows.find(isGasStationIndustry) || null;
    const accepted = Boolean(matchedStore);

    return {
        isLocalCurrencyAccepted: accepted,
        lookupStatus: accepted ? "ACCEPTED" : "NOT_ACCEPTED",
        localCurrencyCheckedAt: checkedAt,
        localCurrencyExpiresAt: expiresAt,
        localCurrencyStoreName: matchedStore?.CMPNM_NM || null,
        localCurrencyName: matchedStore?.REGION_MNY_NM || null,
        localCurrencyIndustryCode: matchedStore ? getIndustryCode(matchedStore) : null,
    };
}

function createLookupResult(status, overrides = {}) {
    const checkedAt = new Date();

    return {
        isLocalCurrencyAccepted: null,
        lookupStatus: status,
        localCurrencyCheckedAt: checkedAt,
        localCurrencyExpiresAt: addMonths(checkedAt, CACHE_REFRESH_MONTHS),
        localCurrencyStoreName: null,
        localCurrencyName: null,
        localCurrencyIndustryCode: null,
        ...overrides,
    };
}

async function resolveStationAddress(originalRoadAddress, stationId) {
    let roadAddress = originalRoadAddress;

    if (!originalRoadAddress) {
        return roadAddress;
    }

    try {
        const standardizedAddress = await jusoAddressService.standardizeRoadAddress(originalRoadAddress);
        roadAddress = standardizedAddress.roadAddress || originalRoadAddress;

        if (standardizedAddress.source === "juso" && roadAddress !== originalRoadAddress) {
            console.log(`도로명주소 정제: ${originalRoadAddress} -> ${roadAddress}`);
        }
    } catch (error) {
        console.error(`도로명주소 API 조회 실패 (${stationId}):`, error.message);
    }

    return roadAddress;
}

async function checkLocalCurrency({ originalRoadAddress, roadAddress, stationId }) {
    if (!originalRoadAddress) {
        return createLookupResult("UNKNOWN");
    }

    if (!isGyeonggiAddress(roadAddress)) {
        return createLookupResult("OUT_OF_SCOPE");
    }

    try {
        return await lookupLocalCurrencyByRoadAddress(roadAddress);
    } catch (error) {
        console.error(`지역화폐 API 조회 실패 (${stationId}):`, error.message);
        return createLookupResult("ERROR");
    }
}

async function refreshStationCache(station) {
    const detailCheckedAt = new Date();
    const detailResponse = await opinetService.fetchStationDetailById(station.id);
    const oil = getOpinetDetailOil(detailResponse);

    const originalRoadAddress = oil?.NEW_ADR || null;
    const lotAddress = oil?.VAN_ADR || null;
    const roadAddress = await resolveStationAddress(originalRoadAddress, station.id);
    const sigunName = oil?.SIGUN_NM || extractSigunName(roadAddress || lotAddress);
    const localCurrencyResult = await checkLocalCurrency({
        originalRoadAddress,
        roadAddress,
        stationId: station.id,
    });

    return localCurrencyCacheRepository.upsertCache({
        stationUid: station.id,
        stationName: oil?.OS_NM || station.name,
        roadAddress,
        lotAddress,
        sigunName,
        opinetDetailCheckedAt: detailCheckedAt,
        ...localCurrencyResult,
    });
}

function toLocalCurrencyResponse(cache) {
    if (!cache) {
        return {
            accepted: null,
            status: "UNKNOWN",
            checkedAt: null,
            expiresAt: null,
        };
    }

    return {
        accepted: cache.isLocalCurrencyAccepted,
        status: cache.lookupStatus,
        checkedAt: cache.localCurrencyCheckedAt,
        expiresAt: cache.localCurrencyExpiresAt,
        storeName: cache.localCurrencyStoreName,
        currencyName: cache.localCurrencyName,
        industryCode: cache.localCurrencyIndustryCode,
        roadAddress: cache.roadAddress,
    };
}

async function attachLocalCurrencyInfo(stations) {
    if (!stations || stations.length === 0) {
        return stations;
    }

    const stationIds = stations.map((station) => station.id).filter(Boolean);
    const cachedRows = await localCurrencyCacheRepository.findByStationUids(stationIds);
    const cacheByStationUid = new Map(cachedRows.map((cache) => [cache.stationUid, cache]));

    const stationsToRefresh = stations.filter((station) => !isCacheFresh(cacheByStationUid.get(station.id)));

    if (stationsToRefresh.length > 0) {
        console.log(`지역화폐 캐시 갱신 대상: ${stationsToRefresh.length}개`);

        const refreshedRows = await mapWithConcurrency(stationsToRefresh, REFRESH_CONCURRENCY, refreshStationCache);

        refreshedRows.filter(Boolean).forEach((cache) => {
            cacheByStationUid.set(cache.stationUid, cache);
        });
    }

    return stations.map((station) => ({
        ...station,
        localCurrency: toLocalCurrencyResponse(cacheByStationUid.get(station.id)),
    }));
}

module.exports = {
    attachLocalCurrencyInfo,
};
