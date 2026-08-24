const { createAppError } = require("./errors");
const config = require("./config");

const ALLOWED_PATH_TYPES = new Set(["pen", "waypoint"]);
const DEFAULT_RADIUS_KM = 3.0;
const MAX_RADIUS_KM = config.MAX_RADIUS_METERS / 1000;

function validateStationsPathRequest(req, res, next) {
    try {
        req.searchCriteria = parseSearchCriteria(req.body);
        next();
    } catch (error) {
        next(error);
    }
}

function validateStationsNameRequest(req, res, next) {
    try {
        req.searchCriteria = parseStationNameSearchCriteria(req.query);
        next();
    } catch (error) {
        next(error);
    }
}

function parseSearchCriteria(body) {
    const requestBody = body && typeof body === "object" && !Array.isArray(body) ? body : {};
    const hasPaths = Object.prototype.hasOwnProperty.call(requestBody, "paths");

    if (!hasPaths) {
        throw createInvalidInputError();
    }

    if (!Array.isArray(requestBody.paths) || requestBody.paths.length === 0) {
        throw createInvalidInputError();
    }

    requestBody.paths.forEach(validatePath);

    return {
        paths: requestBody.paths,
        radiusKm: parseRadiusKm(requestBody.radiusKm),
    };
}

function validatePath(path) {
    if (!path || typeof path !== "object" || Array.isArray(path)) {
        throw createInvalidInputError();
    }

    if (!ALLOWED_PATH_TYPES.has(path.type)) {
        throw createInvalidInputError();
    }

    if (!Array.isArray(path.points) || path.points.length === 0) {
        throw createInvalidInputError();
    }

    path.points.forEach(validatePoint);
}

function validatePoint(point) {
    if (!point || typeof point !== "object" || Array.isArray(point)) {
        throw createInvalidInputError();
    }

    if (!isValidLatitude(point.lat) || !isValidLongitude(point.lng)) {
        throw createInvalidInputError();
    }
}

function parseRadiusKm(radiusKm) {
    if (radiusKm === undefined) {
        return DEFAULT_RADIUS_KM;
    }

    if (typeof radiusKm !== "number" || !Number.isFinite(radiusKm) || radiusKm <= 0) {
        throw createInvalidInputError();
    }

    if (radiusKm > MAX_RADIUS_KM) {
        throw createInvalidInputError();
    }

    return radiusKm;
}

function parseStationNameSearchCriteria(query) {
    const requestQuery = query && typeof query === "object" && !Array.isArray(query) ? query : {};

    return {
        osnm: parseStationName(requestQuery.osnm),
        area: parseAreaCode(requestQuery.area),
    };
}

function parseStationName(value) {
    if (typeof value !== "string") {
        throw createInvalidInputError();
    }

    const stationName = value.trim();

    if (Array.from(stationName).length < 2) {
        throw createInvalidInputError();
    }

    return stationName;
}

function parseAreaCode(value) {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "string") {
        throw createInvalidInputError();
    }

    const areaCode = value.trim();

    if (areaCode.length === 0) {
        return undefined;
    }

    if (!/^\d{2}$/.test(areaCode)) {
        throw createInvalidInputError();
    }

    return areaCode;
}

function createInvalidInputError() {
    return createAppError("INVALID_INPUT");
}

function isValidLatitude(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

module.exports = {
    validateStationsPathRequest,
    validateStationsNameRequest,
    parseSearchCriteria,
    parseStationNameSearchCriteria,
};
