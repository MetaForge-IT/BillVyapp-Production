import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { searchController } from "./search.controller";

const searchRouter = Router();

searchRouter.use(authenticate);
searchRouter.get("/", searchController.search);

export { searchRouter };
