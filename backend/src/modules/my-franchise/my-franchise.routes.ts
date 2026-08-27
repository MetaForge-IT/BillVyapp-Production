import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate, authorize } from "../auth/auth.middleware";
import { myFranchiseController } from "./my-franchise.controller";
import { createManagerSchema, createShopSchema, updateShopAddressSchema } from "./my-franchise.validators";

const myFranchiseRouter = Router();

myFranchiseRouter.use(authenticate, authorize("admin"));

myFranchiseRouter.get("/", myFranchiseController.get);
myFranchiseRouter.post(
  "/managers",
  validateRequest(createManagerSchema),
  myFranchiseController.createManager,
);
myFranchiseRouter.post(
  "/shops",
  validateRequest(createShopSchema),
  myFranchiseController.createShop,
);
myFranchiseRouter.patch(
  "/shops/:shopId",
  validateRequest(updateShopAddressSchema),
  myFranchiseController.updateShop,
);
myFranchiseRouter.delete("/shops/:shopId", myFranchiseController.deleteShop);

export { myFranchiseRouter };
