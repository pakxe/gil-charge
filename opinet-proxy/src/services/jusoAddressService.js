const axios = require("axios");
const config = require("../config");

function normalizeAddressText(address) {
    if (!address) {
        return null;
    }

    return address.trim().replace(/\s+/g, " ").replace(/^경기\s+/, "경기도 ");
}

function getJusoRows(responseData) {
    const rows = responseData?.results?.juso;
    return Array.isArray(rows) ? rows : [];
}

function getJusoCommon(responseData) {
    return responseData?.results?.common || {};
}

async function standardizeRoadAddress(address) {
    const normalizedAddress = normalizeAddressText(address);

    if (!normalizedAddress) {
        return {
            roadAddress: null,
            raw: null,
            source: "empty",
        };
    }

    if (!config.JUSO_ADDRESS_API_KEY) {
        console.warn("JUSO_ADDRESS_API_KEY가 없어 간단 주소 정규화만 사용합니다.");
        return {
            roadAddress: normalizedAddress,
            raw: null,
            source: "fallback",
        };
    }

    const response = await axios.get(config.JUSO_ADDRESS_API_URL, {
        params: {
            confmKey: config.JUSO_ADDRESS_API_KEY,
            currentPage: 1,
            countPerPage: 1,
            keyword: normalizedAddress,
            resultType: "json",
        },
    });

    const common = getJusoCommon(response.data);
    const rows = getJusoRows(response.data);

    if (common.errorCode && common.errorCode !== "0") {
        console.warn(`도로명주소 API 오류 (${common.errorCode}): ${common.errorMessage}`);
    }

    const matchedAddress = rows[0]?.roadAddrPart1 || rows[0]?.roadAddr || null;

    return {
        roadAddress: matchedAddress || normalizedAddress,
        raw: response.data,
        source: matchedAddress ? "juso" : "fallback",
    };
}

module.exports = {
    standardizeRoadAddress,
};
