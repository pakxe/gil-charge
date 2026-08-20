const express = require("express");
const { getStationsByPath } = require("../controllers/stationController");
const { methodNotAllowed } = require("../errorMiddleware");
const { validateStationsPathRequest } = require("../stationRequestValidator");

const router = express.Router();

// POST /api/stations/path
router.route("/path").post(validateStationsPathRequest, getStationsByPath).all(methodNotAllowed);

module.exports = router;
