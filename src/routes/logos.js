const express = require("express");
const logosRouter = express.Router();
const LogoController = require("../controllers/LogoController");
const ErrorHandlerMiddleware = require("../middlewares/ErrorHandlerMiddleware");
const ResponseMiddleware = require("../middlewares/ResponseMiddleware");

logosRouter.get(
  "/",
  ErrorHandlerMiddleware(LogoController().getPublicLogos),
  ResponseMiddleware,
);

module.exports = logosRouter;
