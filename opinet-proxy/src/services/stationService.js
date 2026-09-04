const opinetService = require("./opinetService");

async function findStationsAlongPaths({ paths, radiusKm }) {
    return opinetService.fetchStationsAlongPaths(paths, radiusKm);
}

async function findStationsByName(searchCriteria) {
    return opinetService.fetchStationsByName(searchCriteria);
}

module.exports = {
    findStationsAlongPaths,
    findStationsByName,
};
