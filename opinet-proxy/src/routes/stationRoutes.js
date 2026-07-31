const express = require("express");
const { getStationsByPath } = require("../controllers/stationController");

const router = express.Router();

// POST /api/stations/path
router.post("/path", getStationsByPath);

module.exports = router;
