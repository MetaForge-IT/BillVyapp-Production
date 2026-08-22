import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { serviceProductLinksController } from "./service-product-links.controller";
import { replaceServiceProductLinksSchema } from "./service-product-links.validators";

const serviceProductLinksRouter = Router();

serviceProductLinksRouter.use(authenticate);

serviceProductLinksRouter.get("/", serviceProductLinksController.list);
serviceProductLinksRouter.put(
  "/:serviceId",
  validateRequest(replaceServiceProductLinksSchema),
  serviceProductLinksController.replace,
);

export { serviceProductLinksRouter };
