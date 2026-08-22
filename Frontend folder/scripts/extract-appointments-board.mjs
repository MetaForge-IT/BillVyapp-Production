/**
 * Generates board component files from Appointments.tsx line ranges.
 * Run: node scripts/extract-appointments-board.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(root, "src/app/pages/Appointments.tsx");
const boardDir = path.join(root, "src/app/pages/appointments/board");
const lines = fs.readFileSync(srcPath, "utf8").split(/\r?\n/);

const slice = (start, end) => lines.slice(start - 1, end).join("\n");

const WRAPPERS = {
  "TimelineBoard.tsx": {
    start: 1602,
    end: 1974,
    imports: `import { cn } from "../../../components/ui/utils";
import { Card, CardContent } from "../../../components/ui/card";
import { Pagination } from "../../../components/shared/Pagination";
import { Clock, Phone, PlayCircle, Receipt, X, XCircle } from "lucide-react";
import type { Appointment } from "./boardTypes";
import type { TimelineBoardProps } from "./TimelineBoard.types";`,
    propsType: "TimelineBoardProps",
    propsFile: "TimelineBoard.types.ts",
  },
};

// Write raw JSX slices for manual wrapper completion
const rawSections = {
  TimelineBoard: [1602, 1974],
  QueueBoard: [1978, 2068],
  CalendarBoard: [2071, 2279],
  BillingCheckoutDialog: [2962, 3809],
  ReceiptResultDialog: [3813, 4097],
};

for (const [name, [start, end]] of Object.entries(rawSections)) {
  const out = path.join(boardDir, `_${name}.jsx.txt`);
  fs.writeFileSync(out, slice(start, end));
  console.log(`${name}: ${end - start + 1} lines -> ${path.basename(out)}`);
}

// AppointmentDialogs combined
const dialogParts = [
  [2435, 2502],
  [2505, 2518],
  [2885, 2959],
  [4100, 4109],
  [4112, 4166],
  [4169, 4226],
];
const combined = dialogParts.map(([s, e]) => slice(s, e)).join("\n\n");
fs.writeFileSync(path.join(boardDir, "_AppointmentDialogs.jsx.txt"), combined);
console.log("AppointmentDialogs combined");
