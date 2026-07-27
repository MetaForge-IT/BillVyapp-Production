import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { sendCreated } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { BadRequestError } from "../../utils/errors";
import { uploadFile } from "../../services/storage.service";

export class UploadsController {
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      throw new BadRequestError("File is required", [
        { field: "file", message: 'Upload a file in the multipart field "file"' },
      ]);
    }

    const ext = path.extname(file.originalname || "").toLowerCase();
    const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;

    const uploaded = await uploadFile({
      key,
      body: file.buffer,
      contentType: file.mimetype || "application/octet-stream",
    });

    sendCreated(res, {
      message: "File uploaded",
      data: uploaded,
    });
  });
}

export const uploadsController = new UploadsController();
