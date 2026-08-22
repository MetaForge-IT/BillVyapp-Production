import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { couponsController } from "./coupons.controller";
import { createCouponSchema, updateCouponSchema } from "./coupons.validators";

const couponsRouter = Router();

couponsRouter.use(authenticate);

couponsRouter.get("/", couponsController.list);
couponsRouter.get("/:couponId", couponsController.getById);
couponsRouter.post("/", validateRequest(createCouponSchema), couponsController.create);
couponsRouter.patch("/:couponId", validateRequest(updateCouponSchema), couponsController.update);
couponsRouter.delete("/:couponId", couponsController.delete);

export { couponsRouter };
