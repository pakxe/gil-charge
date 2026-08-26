const opinetService = require("../services/opinetService");
const localCurrencyService = require("../services/localCurrencyService");

async function getStationsByPath(req, res) {
    const { paths, radiusKm } = req.searchCriteria;
    const finalStations = await opinetService.fetchStationsAlongPaths(paths, radiusKm);
    console.log(`중복 제거 후 총 ${finalStations.length}개의 주유소를 찾았습니다.`);

    const stationsWithLocalCurrency = await localCurrencyService.attachLocalCurrencyInfo(finalStations, {
        fetchStationDetailById: opinetService.fetchStationDetailById,
    });

    res.json({ stations: stationsWithLocalCurrency });
}

async function getStationsByName(req, res) {
    const stations = await opinetService.fetchStationsByName(req.searchCriteria);

    res.json({ stations });
}

module.exports = { getStationsByPath, getStationsByName };
