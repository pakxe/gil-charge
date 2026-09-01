const opinetService = require("./opinetService");
const localCurrencyService = require("./localCurrencyService");

async function findStationsAlongPaths({ paths, radiusKm }) {
    const stations = await opinetService.fetchStationsAlongPaths(paths, radiusKm);
    return localCurrencyService.attachLocalCurrencyInfo(stations);
}

async function findStationsByName(searchCriteria) {
    return opinetService.fetchStationsByName(searchCriteria);
}

module.exports = {
    findStationsAlongPaths,
    findStationsByName,
};
