const stationService = require("../services/stationService");

async function getStationsByPath(req, res) {
    const stations = await stationService.findStationsAlongPaths(req.searchCriteria);
    res.json({ stations });
}

async function getStationsByName(req, res) {
    const stations = await stationService.findStationsByName(req.searchCriteria);

    res.json({ stations });
}

module.exports = { getStationsByPath, getStationsByName };
