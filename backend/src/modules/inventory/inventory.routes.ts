import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { inventoryStatsController } from "./inventory-stats.controller";

const inventoryRouter = Router();

inventoryRouter.use(authenticate);
inventoryRouter.get("/stats", inventoryStatsController.getStats);

export { inventoryRouter };
