import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { servicesController } from "./services.controller";
import { createServiceSchema, updateServiceSchema } from "./services.validators";

const servicesRouter = Router();

servicesRouter.use(authenticate);

servicesRouter.get("/catalog", servicesController.listCatalog);
servicesRouter.get("/", servicesController.list);
servicesRouter.get("/:serviceId", servicesController.getById);
servicesRouter.post("/", validateRequest(createServiceSchema), servicesController.create);
servicesRouter.patch("/:serviceId", validateRequest(updateServiceSchema), servicesController.update);
servicesRouter.delete("/:serviceId", servicesController.delete);

export { servicesRouter };
