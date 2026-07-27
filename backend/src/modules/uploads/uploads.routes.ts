import { Router } from "express";
import multer from "multer";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "../auth/auth.middleware";
import { uploadsController } from "./uploads.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadsRouter = Router();

uploadsRouter.use(authenticate);

uploadsRouter.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      next(
        new BadRequestError(err.message, [
          { field: "file", message: err.message },
        ]),
      );
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}, uploadsController.create);

export { uploadsRouter };
