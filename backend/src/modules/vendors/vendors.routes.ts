import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { vendorsController } from "./vendors.controller";
import { createVendorSchema, updateVendorSchema } from "./vendors.validators";

const vendorsRouter = Router();

vendorsRouter.use(authenticate);

vendorsRouter.get("/", vendorsController.list);
vendorsRouter.get("/:vendorId", vendorsController.getById);
vendorsRouter.post("/", validateRequest(createVendorSchema), vendorsController.create);
vendorsRouter.patch("/:vendorId", validateRequest(updateVendorSchema), vendorsController.update);
vendorsRouter.delete("/:vendorId", vendorsController.delete);

export { vendorsRouter };
