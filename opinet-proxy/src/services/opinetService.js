const axios = require("axios");
const config = require("../config");
const { createAppError, isAppError } = require("../errors");
const { samplePathPoints } = require("../utils/geo");
const { toKatech, toWgs84 } = require("../utils/coordinates");

async function fetchStationsAlongPaths(paths, radiusKm) {
    assertOpinetConfigured();

    const radiusMeters = Math.round(radiusKm * 1000);
    const safeRadius = radiusMeters;

    // 1. 대표 좌표 추출
    const targetPoints = samplePathPoints(paths, safeRadius);
    console.log(`총 ${targetPoints.length}개의 대표 지점으로 압축되었습니다.`);

    // 2. 다중 API 병렬 요청
    const fetchPromises = targetPoints.map(async (point) => {
        const { x, y } = toKatech(point.lat, point.lng);
        console.log("오피넷 반경 조회:", { x, y, radius: safeRadius });

        const responseData = await requestOpinet(config.OPINET_BASE_URL, {
            code: config.OPINET_API_KEY,
            x,
            y,
            radius: safeRadius,
            out: "json",
        });
        const oilList = getAroundOilList(responseData);

        if (oilList.length > 0) {
            console.log(`${point.lat}, ${point.lng} 근처 주유소 발견: ${oilList.length}개`);
        }

        return oilList;
    });

    const resultsArray = await Promise.all(fetchPromises);

    // 3. 중복 제거 로직
    const uniqueStationsMap = new Map();

    resultsArray.forEach((stationList) => {
        stationList.forEach((station) => {
            if (!uniqueStationsMap.has(station.UNI_ID)) {
                const gisX = Number(station.GIS_X_COOR);
                const gisY = Number(station.GIS_Y_COOR);

                if (!station.UNI_ID || !Number.isFinite(gisX) || !Number.isFinite(gisY)) {
                    throw createOpinetUnavailableError(new Error("Invalid station response item"), {
                        reason: "invalid_station_item",
                    });
                }

                const { lat, lng } = toWgs84(gisX, gisY);

                uniqueStationsMap.set(station.UNI_ID, {
                    id: station.UNI_ID,
                    name: station.OS_NM,
                    price: station.PRICE,
                    lat,
                    lng,
                    brand: station.POLL_DIV_CO,
                });
            }
        });
    });

    return Array.from(uniqueStationsMap.values());
}

async function fetchStationDetailById(id) {
    assertOpinetConfigured();
    console.log("오피넷 상세정보 조회:", { id });

    const responseData = await requestOpinet(config.OPINET_DETAIL_BY_ID_URL, {
        code: config.OPINET_API_KEY,
        id,
        out: "json",
    });

    if (!responseData?.RESULT || typeof responseData.RESULT !== "object") {
        throw createOpinetUnavailableError(new Error("Invalid detail response shape"), {
            reason: "invalid_detail_response",
        });
    }

    return responseData;
}

function assertOpinetConfigured() {
    if (!config.OPINET_API_KEY) {
        throw createAppError("CONFIGURATION_ERROR", {
            context: {
                missing: "OPINET_API_KEY",
            },
        });
    }
}

async function requestOpinet(url, params) {
    try {
        const response = await axios.get(url, { params });
        const responseError = extractOpinetResponseError(response.data);

        if (responseError) {
            throw createOpinetUnavailableError(new Error("Opinet returned an error response"), responseError);
        }

        return response.data;
    } catch (error) {
        if (isAppError(error)) {
            throw error;
        }

        throw createOpinetUnavailableError(error, {
            reason: classifyAxiosError(error),
            upstreamStatus: error.response?.status,
        });
    }
}

function getAroundOilList(responseData) {
    const result = responseData?.RESULT;

    if (!result || typeof result !== "object") {
        throw createOpinetUnavailableError(new Error("Invalid around response shape"), {
            reason: "invalid_around_response",
        });
    }

    if (result.OIL === undefined || result.OIL === null) {
        return [];
    }

    if (!Array.isArray(result.OIL)) {
        throw createOpinetUnavailableError(new Error("Invalid OIL response shape"), {
            reason: "invalid_oil_response",
        });
    }

    return result.OIL;
}

function extractOpinetResponseError(responseData) {
    const result = responseData?.RESULT;
    const code = firstString(
        responseData?.CODE,
        responseData?.code,
        responseData?.errorCode,
        responseData?.ERR_CODE,
        result?.CODE,
        result?.code,
        result?.errorCode,
        result?.ERR_CODE,
        result?.RESULT_CODE
    );
    const message = firstString(
        responseData?.MESSAGE,
        responseData?.MSG,
        responseData?.message,
        responseData?.errorMessage,
        responseData?.ERR_MSG,
        result?.MESSAGE,
        result?.MSG,
        result?.message,
        result?.errorMessage,
        result?.ERR_MSG,
        result?.RESULT_MSG
    );

    if (!code || isSuccessOpinetCode(code)) {
        return null;
    }

    return {
        reason: classifyOpinetErrorMessage(`${code} ${message || ""}`),
        upstreamCode: code,
        upstreamMessage: message,
    };
}

function firstString(...values) {
    const value = values.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
    return value?.trim();
}

function isSuccessOpinetCode(code) {
    return ["0", "00", "000", "0000", "SUCCESS"].includes(String(code).toUpperCase());
}

function classifyAxiosError(error) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return "timeout";
    }

    if (error.response) {
        return "http_error";
    }

    return "network_error";
}

function classifyOpinetErrorMessage(value) {
    if (/quota|limit|daily|exceed|초과|일일|호출|300/i.test(value)) {
        return "daily_quota_exceeded";
    }

    return "upstream_error";
}

function createOpinetUnavailableError(cause, context = {}) {
    return createAppError("OPINET_UNAVAILABLE", {
        cause,
        context: {
            upstream: "opinet",
            ...context,
        },
    });
}

module.exports = { fetchStationsAlongPaths, fetchStationDetailById };
