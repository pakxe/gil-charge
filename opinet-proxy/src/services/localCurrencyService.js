const axios = require("axios");
const config = require("../config");
const localCurrencyCacheRepository = require("../repositories/localCurrencyCacheRepository");

const CACHE_REFRESH_MONTHS = 1;
const REFRESH_CONCURRENCY = 5;

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
            localCurrencyRaw: {
                skipped: true,
                reason: "GYEONGGI_LOCAL_CURRENCY_API_KEY is not configured.",
            },
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
    const matchedStore = rows[0] || null;
    const accepted = rows.length > 0;

    return {
        isLocalCurrencyAccepted: accepted,
        lookupStatus: accepted ? "ACCEPTED" : "NOT_ACCEPTED",
        localCurrencyCheckedAt: checkedAt,
        localCurrencyExpiresAt: expiresAt,
        localCurrencyStoreName: matchedStore?.CMPNM_NM || null,
        localCurrencyRaw: response.data,
    };
}

async function refreshStationCache(station, fetchStationDetailById) {
    const detailCheckedAt = new Date();
    const detailResponse = await fetchStationDetailById(station.id);
    const oil = getOpinetDetailOil(detailResponse);

    const roadAddress = oil?.NEW_ADR || null;
    const lotAddress = oil?.VAN_ADR || null;
    const sigunName = oil?.SIGUN_NM || extractSigunName(roadAddress || lotAddress);

    if (!roadAddress && !lotAddress) {
        const checkedAt = new Date();
        const cache = {
            stationUid: station.id,
            stationName: oil?.OS_NM || station.name,
            roadAddress,
            lotAddress,
            sigunName,
            isLocalCurrencyAccepted: null,
            lookupStatus: "UNKNOWN",
            opinetDetailCheckedAt: detailCheckedAt,
            localCurrencyCheckedAt: checkedAt,
            localCurrencyExpiresAt: addMonths(checkedAt, CACHE_REFRESH_MONTHS),
            localCurrencyStoreName: null,
            localCurrencyRaw: {
                skipped: true,
                reason: "Opinet detail response does not include address fields.",
            },
            opinetDetailRaw: detailResponse,
        };

        return localCurrencyCacheRepository.upsertCache(cache);
    }

    if (!roadAddress) {
        const checkedAt = new Date();
        const cache = {
            stationUid: station.id,
            stationName: oil?.OS_NM || station.name,
            roadAddress,
            lotAddress,
            sigunName,
            isLocalCurrencyAccepted: null,
            lookupStatus: "UNKNOWN",
            opinetDetailCheckedAt: detailCheckedAt,
            localCurrencyCheckedAt: checkedAt,
            localCurrencyExpiresAt: addMonths(checkedAt, CACHE_REFRESH_MONTHS),
            localCurrencyStoreName: null,
            localCurrencyRaw: {
                skipped: true,
                reason: "Gyeonggi local currency API requires REFINE_ROADNM_ADDR, but road address is missing.",
            },
            opinetDetailRaw: detailResponse,
        };

        return localCurrencyCacheRepository.upsertCache(cache);
    }

    if (!isGyeonggiAddress(roadAddress)) {
        const checkedAt = new Date();
        const cache = {
            stationUid: station.id,
            stationName: oil?.OS_NM || station.name,
            roadAddress,
            lotAddress,
            sigunName,
            isLocalCurrencyAccepted: null,
            lookupStatus: "OUT_OF_SCOPE",
            opinetDetailCheckedAt: detailCheckedAt,
            localCurrencyCheckedAt: checkedAt,
            localCurrencyExpiresAt: addMonths(checkedAt, CACHE_REFRESH_MONTHS),
            localCurrencyStoreName: null,
            localCurrencyRaw: null,
            opinetDetailRaw: detailResponse,
        };

        return localCurrencyCacheRepository.upsertCache(cache);
    }

    try {
        const localCurrencyResult = await lookupLocalCurrencyByRoadAddress(roadAddress);

        const cache = {
            stationUid: station.id,
            stationName: oil?.OS_NM || station.name,
            roadAddress,
            lotAddress,
            sigunName,
            ...localCurrencyResult,
            opinetDetailCheckedAt: detailCheckedAt,
            opinetDetailRaw: detailResponse,
        };

        return localCurrencyCacheRepository.upsertCache(cache);
    } catch (error) {
        console.error(`지역화폐 API 조회 실패 (${station.id}):`, error.message);

        const checkedAt = new Date();
        const cache = {
            stationUid: station.id,
            stationName: oil?.OS_NM || station.name,
            roadAddress,
            lotAddress,
            sigunName,
            isLocalCurrencyAccepted: null,
            lookupStatus: "ERROR",
            opinetDetailCheckedAt: detailCheckedAt,
            localCurrencyCheckedAt: checkedAt,
            localCurrencyExpiresAt: addMonths(checkedAt, CACHE_REFRESH_MONTHS),
            localCurrencyStoreName: null,
            localCurrencyRaw: {
                error: error.message,
            },
            opinetDetailRaw: detailResponse,
        };

        return localCurrencyCacheRepository.upsertCache(cache);
    }
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
        roadAddress: cache.roadAddress,
    };
}

async function attachLocalCurrencyInfo(stations, { fetchStationDetailById }) {
    if (!stations || stations.length === 0) {
        return stations;
    }

    const stationIds = stations.map((station) => station.id).filter(Boolean);
    const cachedRows = await localCurrencyCacheRepository.findByStationUids(stationIds);
    const cacheByStationUid = new Map(cachedRows.map((cache) => [cache.stationUid, cache]));

    const stationsToRefresh = stations.filter((station) => !isCacheFresh(cacheByStationUid.get(station.id)));

    if (stationsToRefresh.length > 0) {
        console.log(`지역화폐 캐시 갱신 대상: ${stationsToRefresh.length}개`);

        const refreshedRows = await mapWithConcurrency(stationsToRefresh, REFRESH_CONCURRENCY, (station) =>
            refreshStationCache(station, fetchStationDetailById)
        );

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
