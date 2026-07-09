const router = require("express").Router();

router.use("/auth", require("./auth"));
router.use("/user", require("./users"));
router.use("/seller", require("./sellers"));
router.use("/admin", require("./admin"));
router.use("/logos", require("./logos"));
router.use("/webhooks", require("./webhooks"));

module.exports = router;
