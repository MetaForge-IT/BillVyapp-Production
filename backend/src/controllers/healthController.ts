import type { Request, Response } from "express";
import { notificationService } from "../modules/notifications/notification.service";
import { getMetricsPayload } from "../middleware/metrics";
import { healthCheck } from "../services/healthService";

export { healthCheck };

export function messagingChannelsCheck(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    message: "Messaging channel status",
    data: notificationService.getChannelStatus(),
  });
}

export async function metricsCheck(_req: Request, res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.status(200).send(await getMetricsPayload());
}
