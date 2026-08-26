const express = require("express");
const { getStationsByName, getStationsByPath } = require("../controllers/stationController");
const { methodNotAllowed } = require("../errorMiddleware");
const { validateStationsNameRequest, validateStationsPathRequest } = require("../stationRequestValidator");

const router = express.Router();

// POST /api/stations/path
router.route("/path").post(validateStationsPathRequest, getStationsByPath).all(methodNotAllowed);

// GET /api/stations/name?osnm=보라매&area=01
router.route("/name").get(validateStationsNameRequest, getStationsByName).all(methodNotAllowed);

module.exports = router;
