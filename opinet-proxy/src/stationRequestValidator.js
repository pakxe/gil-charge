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

function parseSearchCriteria(body) {
    const requestBody = body && typeof body === "object" && !Array.isArray(body) ? body : {};
    const hasPaths = Object.prototype.hasOwnProperty.call(requestBody, "paths");

    if (!hasPaths) {
        throw createAppError("MISSING_PATHS");
    }

    if (!Array.isArray(requestBody.paths)) {
        throw createAppError("INVALID_PATHS");
    }

    if (requestBody.paths.length === 0) {
        throw createAppError("EMPTY_PATHS");
    }

    requestBody.paths.forEach(validatePath);

    return {
        paths: requestBody.paths,
        radiusKm: parseRadiusKm(requestBody.radiusKm),
    };
}

function validatePath(path) {
    if (!path || typeof path !== "object" || !ALLOWED_PATH_TYPES.has(path.type)) {
        throw createAppError("INVALID_PATH_TYPE");
    }

    if (!Array.isArray(path.points) || path.points.length === 0) {
        throw createAppError("INVALID_POINTS");
    }

    path.points.forEach(validatePoint);
}

function validatePoint(point) {
    if (!point || typeof point !== "object") {
        throw createAppError("INVALID_COORDINATE");
    }

    if (!isValidLatitude(point.lat) || !isValidLongitude(point.lng)) {
        throw createAppError("INVALID_COORDINATE");
    }
}

function parseRadiusKm(radiusKm) {
    if (radiusKm === undefined) {
        return DEFAULT_RADIUS_KM;
    }

    if (typeof radiusKm !== "number" || !Number.isFinite(radiusKm) || radiusKm <= 0) {
        throw createAppError("INVALID_RADIUS");
    }

    if (radiusKm > MAX_RADIUS_KM) {
        throw createAppError("RADIUS_TOO_LARGE");
    }

    return radiusKm;
}

function isValidLatitude(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

module.exports = {
    validateStationsPathRequest,
    parseSearchCriteria,
};
