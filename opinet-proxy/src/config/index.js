const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "development" ? ".env.dev" : ".env";
dotenv.config({ path: path.resolve(__dirname, "../../", envFile) });

module.exports = {
    PORT: process.env.PORT || 8080,
    OPINET_API_KEY: process.env.OPINET_API_KEY,
    OPINET_BASE_URL: "http://www.opinet.co.kr/api/aroundAll.do",
    OPINET_DETAIL_BY_ID_URL: "http://www.opinet.co.kr/api/detailById.do",
    OPINET_SEARCH_BY_NAME_URL: "https://www.opinet.co.kr/api/searchByName.do",
    MAX_RADIUS_METERS: 5000, // 오피넷 API 최대 허용 반경
    GYEONGGI_LOCAL_CURRENCY_API_URL:
        process.env.GYEONGGI_LOCAL_CURRENCY_API_URL || "https://openapi.gg.go.kr/RegionMnyFacltStus",
    GYEONGGI_LOCAL_CURRENCY_API_KEY: process.env.GYEONGGI_LOCAL_CURRENCY_API_KEY,
    JUSO_ADDRESS_API_URL:
        process.env.JUSO_ADDRESS_API_URL || "https://business.juso.go.kr/addrlink/addrLinkApi.do",
    JUSO_ADDRESS_API_KEY: process.env.JUSO_ADDRESS_API_KEY,

    DB_HOST: process.env.DB_HOST,
    DB_PORT: Number(process.env.DB_PORT || 3306),
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
};
