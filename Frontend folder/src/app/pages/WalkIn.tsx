import { NewAppointment } from "./NewAppointment";

/** Dedicated walk-in check-in flow — main MSP entry, no appointment mode. */
export function WalkIn() {
  return <NewAppointment mode="walk-in" />;
}
