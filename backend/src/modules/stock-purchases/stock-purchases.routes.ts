import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { stockPurchasesController } from "./stock-purchases.controller";
import {
  createStockPurchaseSchema,
  updateStockPurchaseSchema,
} from "./stock-purchases.validators";

const stockPurchasesRouter = Router();

stockPurchasesRouter.use(authenticate);

stockPurchasesRouter.get("/", stockPurchasesController.list);
stockPurchasesRouter.get("/:purchaseId", stockPurchasesController.getById);
stockPurchasesRouter.post(
  "/",
  validateRequest(createStockPurchaseSchema),
  stockPurchasesController.create,
);
stockPurchasesRouter.patch(
  "/:purchaseId",
  validateRequest(updateStockPurchaseSchema),
  stockPurchasesController.update,
);
stockPurchasesRouter.delete("/:purchaseId", stockPurchasesController.delete);

export { stockPurchasesRouter };
