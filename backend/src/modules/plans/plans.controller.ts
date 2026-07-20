import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthenticatedRequest } from "../auth/auth.controller";
import { plansService } from "./plans.service";
import type { CreatePlanInput, EnrollCustomerInput, UpdatePlanInput } from "./plans.validators";

export class PlansController {
  listServices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const services = await plansService.listServices(auth);
    sendSuccess(res, { message: "Services retrieved", data: services });
  });

  listCustomers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const customers = await plansService.listCustomers(auth);
    sendSuccess(res, { message: "Customers retrieved", data: customers });
  });

  listPlans = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const plans = await plansService.listPlans(auth);
    sendSuccess(res, { message: "Plans retrieved", data: plans });
  });

  createPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as CreatePlanInput;
    const plan = await plansService.createPlan(auth, body);
    sendCreated(res, { message: "Plan created successfully", data: plan });
  });

  updatePlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as UpdatePlanInput;
    const plan = await plansService.updatePlan(auth, String(req.params.planId), body);
    sendSuccess(res, { message: "Plan updated successfully", data: plan });
  });

  listEnrollments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const enrollments = await plansService.listEnrollments(auth);
    sendSuccess(res, { message: "Enrollments retrieved", data: enrollments });
  });

  enrollCustomer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth = (req as AuthenticatedRequest).auth;
    const body = req.body as EnrollCustomerInput;
    const enrollment = await plansService.enrollCustomer(auth, body);
    sendCreated(res, { message: "Membership assigned to customer", data: enrollment });
  });
}

export const plansController = new PlansController();
