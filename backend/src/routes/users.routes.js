const express = require("express");
const asyncHandler = require("../lib/asyncHandler");
const controller = require("../controllers/users.controller");

const router = express.Router();

// ORDER MATTERS, and this is the classic way to get it wrong.
//
// Express matches routes top to bottom. If `/:id` were registered first, a
// request for /api/users/stats would match it with id="stats", fail UUID
// validation, and return 400 "Invalid user id" -- for an endpoint that exists
// and has nothing to do with ids. Literal paths always go above parameterised
// ones.
router.get("/stats", asyncHandler(controller.getStats));

router.get("/", asyncHandler(controller.listUsers));
router.post("/", asyncHandler(controller.createUser));

router.get("/:id", asyncHandler(controller.getUser));
// PATCH, not PUT: the dashboard sends only the fields that changed. PUT means
// "replace the whole resource", so a PUT missing `role` should arguably clear
// it. PATCH matches what the edit modal actually does.
router.patch("/:id", asyncHandler(controller.updateUser));
router.delete("/:id", asyncHandler(controller.deleteUser));

module.exports = router;
