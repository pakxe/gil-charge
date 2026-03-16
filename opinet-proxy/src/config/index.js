require("dotenv").config();

module.exports = {
    PORT: process.env.PORT || 8080,
    OPINET_API_KEY: process.env.OPINET_API_KEY,
    OPINET_BASE_URL: "http://www.opinet.co.kr/api/aroundAll.do",
    MAX_RADIUS_METERS: 5000, // 오피넷 API 최대 허용 반경
};
