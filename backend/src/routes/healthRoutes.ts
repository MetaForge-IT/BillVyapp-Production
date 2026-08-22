import { Router } from "express";
import { healthCheck, messagingChannelsCheck, metricsCheck } from "../controllers/healthController";
import { metricsAuth } from "../middleware/metricsAuth";

const healthRouter = Router();

healthRouter.get("/health", (req, res, next) => {
  void healthCheck(req, res).catch(next);
});
healthRouter.get("/health/messaging", messagingChannelsCheck);
healthRouter.get("/metrics", metricsAuth, (req, res, next) => {
  void metricsCheck(req, res).catch(next);
});

export default healthRouter;

