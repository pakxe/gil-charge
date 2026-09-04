const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "development" ? ".env.dev" : ".env";
dotenv.config({ path: path.resolve(__dirname, "../../", envFile) });

module.exports = {
    PORT: process.env.PORT || 8080,
    OPINET_API_KEY: process.env.OPINET_API_KEY,
    OPINET_BASE_URL: "http://www.opinet.co.kr/api/aroundAll.do",
    OPINET_SEARCH_BY_NAME_URL: "https://www.opinet.co.kr/api/searchByName.do",
    MAX_RADIUS_METERS: 5000, // 오피넷 API 최대 허용 반경
};
