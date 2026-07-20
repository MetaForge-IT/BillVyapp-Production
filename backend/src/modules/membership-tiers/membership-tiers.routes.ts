import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { membershipTiersController } from "./membership-tiers.controller";

const membershipTiersRouter = Router();

membershipTiersRouter.use(authenticate);
membershipTiersRouter.get("/", membershipTiersController.list);

export { membershipTiersRouter };
