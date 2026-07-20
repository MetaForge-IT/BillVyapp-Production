import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { dashboardController } from "./dashboard.controller";

const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get("/", dashboardController.getDashboard);

export { dashboardRouter };
