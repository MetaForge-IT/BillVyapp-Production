import type { Request, Response } from "express";
import { BadRequestError } from "../../utils/errors";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { searchService } from "./search.service";

export class SearchController {
  search = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) {
      throw new BadRequestError("Search query is required");
    }

    const results = await searchService.search(auth, q);
    sendSuccess(res, { message: "Search results retrieved", data: results });
  });
}

export const searchController = new SearchController();
