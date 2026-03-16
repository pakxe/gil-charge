const express = require("express");
const cors = require("cors");
const config = require("./config");
const stationRoutes = require("./routes/stationRoutes");

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우터 연결
app.use("/api/stations", stationRoutes);

// 서버 실행
app.listen(config.PORT, () => {
    console.log(`프록시 서버가 http://localhost:${config.PORT} 에서 실행 중입니다.`);
});
