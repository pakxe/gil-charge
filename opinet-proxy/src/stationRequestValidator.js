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
        throw createMissingFieldsError(["paths"]);
    }

    if (!Array.isArray(requestBody.paths) || requestBody.paths.length === 0) {
        throw createInvalidFieldsError(["paths"]);
    }

    requestBody.paths.forEach((path, pathIndex) => validatePath(path, `paths[${pathIndex}]`));

    return {
        paths: requestBody.paths,
        radiusKm: parseRadiusKm(requestBody.radiusKm),
    };
}

function validatePath(path, fieldPath) {
    if (!path || typeof path !== "object" || Array.isArray(path)) {
        throw createInvalidFieldsError([fieldPath]);
    }

    if (!ALLOWED_PATH_TYPES.has(path.type)) {
        throw createInvalidFieldsError([`${fieldPath}.type`]);
    }

    if (!Array.isArray(path.points) || path.points.length === 0) {
        throw createInvalidFieldsError([`${fieldPath}.points`]);
    }

    path.points.forEach((point, pointIndex) => validatePoint(point, `${fieldPath}.points[${pointIndex}]`));
}

function validatePoint(point, fieldPath) {
    if (!point || typeof point !== "object" || Array.isArray(point)) {
        throw createInvalidFieldsError([fieldPath]);
    }

    const invalidFields = [];

    if (!isValidLatitude(point.lat)) {
        invalidFields.push(`${fieldPath}.lat`);
    }

    if (!isValidLongitude(point.lng)) {
        invalidFields.push(`${fieldPath}.lng`);
    }

    if (invalidFields.length > 0) {
        throw createInvalidFieldsError(invalidFields);
    }
}

function parseRadiusKm(radiusKm) {
    if (radiusKm === undefined) {
        return DEFAULT_RADIUS_KM;
    }

    if (typeof radiusKm !== "number" || !Number.isFinite(radiusKm) || radiusKm <= 0) {
        throw createInvalidFieldsError(["radiusKm"]);
    }

    if (radiusKm > MAX_RADIUS_KM) {
        throw createInvalidFieldsError(["radiusKm"]);
    }

    return radiusKm;
}

function createMissingFieldsError(fields) {
    return createAppError("MISSING_FIELDS", {
        message: `필수 필드가 누락되었습니다: ${formatFields(fields)}`,
        context: { fields },
    });
}

function createInvalidFieldsError(fields) {
    return createAppError("INVALID_FIELDS", {
        message: `필드 값이 올바르지 않습니다: ${formatFields(fields)}`,
        context: { fields },
    });
}

function formatFields(fields) {
    return fields.join(", ");
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
