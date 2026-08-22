import { Queue, type JobsOptions } from "bullmq";
import { logger } from "../utils/logger";
import type {
  SendWhatsAppOtpInput,
  SendWhatsAppTemplateInput,
  SendWhatsAppTextInput,
} from "../modules/whatsapp/whatsapp.types";
import { getBullMqConnection, isBullMqEnabled } from "./connection";

export const WHATSAPP_QUEUE_NAME = "whatsapp-messages";

export type WhatsAppJobName = "send-otp" | "send-template" | "send-text";

export type WhatsAppOtpJobData = {
  kind: "otp";
  payload: SendWhatsAppOtpInput;
};

export type WhatsAppTemplateJobData = {
  kind: "template";
  payload: SendWhatsAppTemplateInput;
};

export type WhatsAppTextJobData = {
  kind: "text";
  payload: SendWhatsAppTextInput;
};

export type WhatsAppJobData =
  | WhatsAppOtpJobData
  | WhatsAppTemplateJobData
  | WhatsAppTextJobData;

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2_000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};

let queue: Queue<WhatsAppJobData, unknown, WhatsAppJobName> | null = null;

export function getWhatsAppQueue(): Queue<WhatsAppJobData, unknown, WhatsAppJobName> | null {
  if (!isBullMqEnabled()) {
    return null;
  }

  if (!queue) {
    const connection = getBullMqConnection();
    if (!connection) return null;

    queue = new Queue<WhatsAppJobData, unknown, WhatsAppJobName>(WHATSAPP_QUEUE_NAME, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    queue.on("error", (error) => {
      logger.warn("WhatsApp queue error", { message: error.message });
    });
  }

  return queue;
}

export async function enqueueWhatsAppTemplate(
  payload: SendWhatsAppTemplateInput,
): Promise<{ queued: true; jobId: string } | { queued: false }> {
  const q = getWhatsAppQueue();
  if (!q) return { queued: false };

  const job = await q.add(
    "send-template",
    { kind: "template", payload },
    {
      priority: 5,
    },
  );

  logger.info("WhatsApp template queued", {
    jobId: job.id,
    templateName: payload.templateName,
  });

  return { queued: true, jobId: String(job.id) };
}

export async function enqueueWhatsAppText(
  payload: SendWhatsAppTextInput,
): Promise<{ queued: true; jobId: string } | { queued: false }> {
  const q = getWhatsAppQueue();
  if (!q) return { queued: false };

  const job = await q.add("send-text", { kind: "text", payload }, { priority: 10 });
  return { queued: true, jobId: String(job.id) };
}

export async function enqueueWhatsAppOtp(
  payload: SendWhatsAppOtpInput,
): Promise<{ queued: true; jobId: string } | { queued: false }> {
  const q = getWhatsAppQueue();
  if (!q) return { queued: false };

  const job = await q.add(
    "send-otp",
    { kind: "otp", payload },
    {
      priority: 1,
      attempts: 3,
      backoff: { type: "exponential", delay: 1_500 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  );

  logger.info("WhatsApp OTP queued", { jobId: job.id });
  return { queued: true, jobId: String(job.id) };
}

export async function closeWhatsAppQueue(): Promise<void> {
  if (!queue) return;
  await queue.close();
  queue = null;
}
