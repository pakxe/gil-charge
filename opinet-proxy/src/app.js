const express = require("express");
const cors = require("cors");
const config = require("./config");
const stationRoutes = require("./routes/stationRoutes");
const { errorHandler, routeNotFound } = require("./errorMiddleware");

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.json({
        ok: true,
        service: "opinet-proxy",
        health: "/health",
        stationsPath: "POST /api/stations/path",
    });
});

// 라우터 연결
app.use("/api/stations", stationRoutes);

// 테스트용 헬스체크 API
app.get("/health", (req, res) => {
    res.json({
        ok: true,
        version: "v1.0.2-test",
        port: config.PORT,
    });
});

app.use(routeNotFound);
app.use(errorHandler);

// 서버 실행
app.listen(config.PORT, () => {
    console.log(`프록시 서버가 http://localhost:${config.PORT} 에서 실행 중입니다.`);
});
