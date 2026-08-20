import type { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError, ForbiddenError } from "../../utils/errors";
import { AUTH_ERROR_CODES, AUTH_HEADERS, AUTH_TOKEN_PREFIXES } from "./auth.constants";
import { authRepository } from "./auth.repository";
import type { AuthContext } from "./auth.types";
import { tokenService } from "./token.service";

interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}

/**
 * Verifies the Bearer access token and attaches the authenticated user context.
 */
export const authenticate: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const accessToken = extractBearerToken(req);
    const payload = tokenService.verifyAccessToken(accessToken);
    const user = await authRepository.findUserById(payload.sub);

    if (!user) {
      throw new AppError(401, "Invalid access token", {
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
      });
    }

    if (!user.isActive) {
      throw new AppError(403, "Account is inactive", {
        code: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
      });
    }

    let salonId = user.salonId ?? "";

    // Franchise staff with no shop link yet: use the franchise's first shop and persist.
    // Avoids empty salon_id FK failures on services/categories/settings.
    if (!salonId && user.franchiseId && user.role !== "super_admin") {
      const resolved = await authRepository.resolvePrimarySalonId(user.id, user.franchiseId);
      if (resolved) salonId = resolved;
    }

    (req as AuthenticatedRequest).auth = {
      userId: user.id,
      salonId,
      franchiseId: user.franchiseId,
      role: user.role,
    };

    next();
  },
);

/**
 * Restricts access to users with the manager role (V1 default guard).
 */
export const requireManager: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const auth = getAuthContext(req);

  if (auth.role !== "manager") {
    next(new ForbiddenError("Manager access required"));
    return;
  }

  next();
};

/**
 * Restricts access to users whose role is in the allowed list.
 */
export function authorize(...roles: string[]): RequestHandler {
  const allowedRoles = new Set(roles);

  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = getAuthContext(req);

    if (!allowedRoles.has(auth.role)) {
      next(new ForbiddenError("Insufficient permissions"));
      return;
    }

    next();
  };
}

function getAuthContext(req: Request): AuthContext {
  const auth = (req as AuthenticatedRequest).auth;

  if (!auth) {
    throw new AppError(401, "Authentication required", {
      code: AUTH_ERROR_CODES.TOKEN_MISSING,
    });
  }

  return auth;
}

function extractBearerToken(req: Request): string {
  const authorizationHeader = req.get(AUTH_HEADERS.AUTHORIZATION);

  if (!authorizationHeader) {
    throw new AppError(401, "Authorization header is missing", {
      code: AUTH_ERROR_CODES.TOKEN_MISSING,
    });
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== AUTH_TOKEN_PREFIXES.BEARER || !token) {
    throw new AppError(401, "Invalid authorization header format", {
      code: AUTH_ERROR_CODES.TOKEN_INVALID,
    });
  }

  return token;
}
