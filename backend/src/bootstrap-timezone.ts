import dotenv from "dotenv";
import { ensureProcessTimezone } from "./utils/ist";

// Load .env first so APP_TIMEZONE / TZ can be honored, then lock process TZ to IST.
dotenv.config();
ensureProcessTimezone();
