import { Worker, type Job } from "bullmq";
import { logger } from "../utils/logger";
import { createWhatsAppProvider } from "../modules/whatsapp/whatsapp.provider-factory";
import { createBullMqConnection, isBullMqEnabled } from "./connection";
import {
  WHATSAPP_QUEUE_NAME,
  type WhatsAppJobData,
  type WhatsAppJobName,
} from "./whatsapp.queue";

let worker: Worker<WhatsAppJobData, unknown, WhatsAppJobName> | null = null;

async function processWhatsAppJob(job: Job<WhatsAppJobData, unknown, WhatsAppJobName>) {
  const provider = createWhatsAppProvider();
  if (!provider) {
    throw new Error("WhatsApp provider is not configured");
  }

  switch (job.data.kind) {
    case "otp": {
      const result = await provider.sendOtp(job.data.payload);
      logger.info("WhatsApp OTP job completed", {
        jobId: job.id,
        messageId: result.messageId,
      });
      return result;
    }
    case "template": {
      if (!provider.sendTemplate) {
        throw new Error(`Provider ${provider.name} does not support templates`);
      }
      const result = await provider.sendTemplate(job.data.payload);
      logger.info("WhatsApp template job completed", {
        jobId: job.id,
        templateName: job.data.payload.templateName,
        messageId: result.messageId,
      });
      return result;
    }
    case "text": {
      const result = await provider.sendText(job.data.payload);
      logger.info("WhatsApp text job completed", { jobId: job.id, messageId: result.messageId });
      return result;
    }
    default:
      throw new Error(`Unknown WhatsApp job kind`);
  }
}

export function startWhatsAppWorker(): Worker<WhatsAppJobData, unknown, WhatsAppJobName> | null {
  if (!isBullMqEnabled()) {
    logger.info("WhatsApp BullMQ worker skipped — Redis not configured");
    return null;
  }

  if (worker) return worker;

  const connection = createBullMqConnection();
  worker = new Worker<WhatsAppJobData, unknown, WhatsAppJobName>(
    WHATSAPP_QUEUE_NAME,
    async (job) => processWhatsAppJob(job),
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, error) => {
    logger.error("WhatsApp job failed", {
      jobId: job?.id,
      name: job?.name,
      attempt: job?.attemptsMade,
      reason: error.message,
    });
  });

  worker.on("error", (error) => {
    logger.warn("WhatsApp worker error", { message: error.message });
  });

  logger.info("WhatsApp BullMQ worker started", { queue: WHATSAPP_QUEUE_NAME });
  return worker;
}

export async function stopWhatsAppWorker(): Promise<void> {
  if (!worker) return;
  await worker.close();
  worker = null;
}
