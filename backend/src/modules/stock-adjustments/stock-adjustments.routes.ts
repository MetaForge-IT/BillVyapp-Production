import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { stockAdjustmentsController } from "./stock-adjustments.controller";
import {
  createStockAdjustmentSchema,
  updateStockAdjustmentSchema,
} from "./stock-adjustments.validators";

const stockAdjustmentsRouter = Router();

stockAdjustmentsRouter.use(authenticate);

stockAdjustmentsRouter.get("/", stockAdjustmentsController.list);
stockAdjustmentsRouter.get("/:adjustmentId", stockAdjustmentsController.getById);
stockAdjustmentsRouter.post(
  "/",
  validateRequest(createStockAdjustmentSchema),
  stockAdjustmentsController.create,
);
stockAdjustmentsRouter.patch(
  "/:adjustmentId",
  validateRequest(updateStockAdjustmentSchema),
  stockAdjustmentsController.update,
);
stockAdjustmentsRouter.delete("/:adjustmentId", stockAdjustmentsController.delete);

export { stockAdjustmentsRouter };
