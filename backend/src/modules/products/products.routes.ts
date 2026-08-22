import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authenticate } from "../auth/auth.middleware";
import { productsController } from "./products.controller";
import { createProductSchema, updateProductSchema } from "./products.validators";

const productsRouter = Router();

productsRouter.use(authenticate);

productsRouter.get("/", productsController.list);
productsRouter.get("/:productId", productsController.getById);
productsRouter.post("/", validateRequest(createProductSchema), productsController.create);
productsRouter.patch("/:productId", validateRequest(updateProductSchema), productsController.update);
productsRouter.delete("/:productId", productsController.delete);

export { productsRouter };
