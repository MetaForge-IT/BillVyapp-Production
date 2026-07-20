import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { registrationService, type RegistrationService } from "./registration.service";
import type { RegisterInput } from "./auth.validators";

/**
 * HTTP adapter for salon registration endpoints.
 */
export class RegistrationController {
  constructor(private readonly service: RegistrationService = registrationService) {}

  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RegisterInput;
    const result = await this.service.register({
      salonName: body.salonName,
      fullName: body.fullName,
      email: body.email,
      mobileNumber: body.mobileNumber,
      password: body.password,
    });

    sendSuccess(res, {
      statusCode: 201,
      message: result.message,
    });
  });
}

export const registrationController = new RegistrationController();
