import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { staffController } from "./staff.controller";

const staffRouter = Router();

staffRouter.use(authenticate);
staffRouter.get("/", staffController.list);

export { staffRouter };
