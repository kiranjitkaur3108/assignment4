const express = require("express");
const router = express.Router();
const controller = require("../controllers/listingController");

// Routes
router.get("/", controller.getAll);           // GET all listings
router.get("/:id", controller.getOne);        // GET one listing by ID
router.post("/", controller.create);          // CREATE new listing
router.put("/:id", controller.update);        // UPDATE listing by ID
router.delete("/:id", controller.remove);     // DELETE listing by ID

module.exports = router;
