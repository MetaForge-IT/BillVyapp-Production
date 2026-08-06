import { closeBullMqConnection } from "./connection";
import { closeWhatsAppQueue } from "./whatsapp.queue";
import { startWhatsAppWorker, stopWhatsAppWorker } from "./whatsapp.worker";

export function startBackgroundWorkers(): void {
  startWhatsAppWorker();
}

export async function stopBackgroundWorkers(): Promise<void> {
  await stopWhatsAppWorker();
  await closeWhatsAppQueue();
  await closeBullMqConnection();
}

export { startWhatsAppWorker, stopWhatsAppWorker } from "./whatsapp.worker";
