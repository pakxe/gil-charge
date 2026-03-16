const opinetService = require("../services/opinetService");

async function getStationsByPath(req, res) {
    const { paths, radiusKm = 3.0 } = req.body;

    if (!paths || paths.length === 0) {
        return res.status(400).json({ error: "경로 데이터가 없습니다." });
    }

    try {
        const finalStations = await opinetService.fetchStationsAlongPaths(paths, radiusKm);
        console.log(`중복 제거 후 총 ${finalStations.length}개의 주유소를 찾았습니다.`);

        res.json({ stations: finalStations });
    } catch (error) {
        console.error("오피넷 API 처리 중 에러:", error.message);
        res.status(500).json({ error: "주유소 데이터를 가져오는 데 실패했습니다." });
    }
}

module.exports = { getStationsByPath };
