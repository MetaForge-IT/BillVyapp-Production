import { useEffect, useState } from "react";
import { fetchStaff } from "../api/staff";
import type { AppointmentStaff } from "../app/pages/appointments/appointmentData";

function mapToAppointmentStaff(fullName: string, id: string, role: string): AppointmentStaff {
  return {
    id,
    name: fullName,
    role,
    initials: fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
}

export function useStaff() {
  const [staff, setStaff] = useState<AppointmentStaff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchStaff()
      .then((members) => {
        if (cancelled) return;
        setStaff(members.map((m) => mapToAppointmentStaff(m.fullName, m.id, m.role)));
      })
      .catch(() => {
        if (!cancelled) setStaff([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { staff, loading };
}
