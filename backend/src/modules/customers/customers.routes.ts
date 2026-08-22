import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { customersController } from "./customers.controller";
import {
  createCustomerSchema,
  redeemLoyaltySchema,
  updateCustomerSchema,
} from "./customers.validators";

const customersRouter = Router();

customersRouter.use(authenticate);

customersRouter.get("/", customersController.list);
customersRouter.get("/lookup", customersController.lookupByPhone);
customersRouter.get("/search", customersController.searchByPhone);
customersRouter.get("/:customerId/visits", customersController.getVisits);
customersRouter.get("/:customerId/loyalty", customersController.getLoyalty);
customersRouter.post(
  "/:customerId/loyalty/redeem",
  validateRequest(redeemLoyaltySchema),
  customersController.redeemLoyalty,
);
customersRouter.get("/:customerId", customersController.getById);
customersRouter.post("/", validateRequest(createCustomerSchema), customersController.create);
customersRouter.patch("/:customerId", validateRequest(updateCustomerSchema), customersController.update);
customersRouter.delete("/:customerId", customersController.delete);

export { customersRouter };
