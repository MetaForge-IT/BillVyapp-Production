import { Router } from "express";
import { healthCheck, messagingChannelsCheck, metricsCheck } from "../controllers/healthController";

const healthRouter = Router();

healthRouter.get("/health", (req, res, next) => {
  void healthCheck(req, res).catch(next);
});
healthRouter.get("/health/messaging", messagingChannelsCheck);
healthRouter.get("/metrics", (req, res, next) => {
  void metricsCheck(req, res).catch(next);
});

export default healthRouter;

