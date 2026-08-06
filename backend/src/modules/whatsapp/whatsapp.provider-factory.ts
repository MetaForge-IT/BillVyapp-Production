import type { WhatsAppProvider } from "./whatsapp.provider";
import { whatsappConfig } from "../../config/whatsapp.config";
import { Dialog360WhatsAppProvider } from "./providers/dialog360.whatsapp.provider";
import { MetaWhatsAppProvider } from "./providers/meta.whatsapp.provider";
import { SparklebotWhatsAppProvider } from "./providers/sparklebot.whatsapp.provider";

/**
 * Shared provider factory — used by WhatsAppService and BullMQ worker.
 */
export function createWhatsAppProvider(): WhatsAppProvider | null {
  if (!whatsappConfig.enabled) {
    return null;
  }

  switch (whatsappConfig.provider) {
    case "sparklebot":
    case "custom":
      return new SparklebotWhatsAppProvider();
    case "meta":
      return new MetaWhatsAppProvider();
    case "dialog360":
      return new Dialog360WhatsAppProvider();
    default:
      return null;
  }
}
