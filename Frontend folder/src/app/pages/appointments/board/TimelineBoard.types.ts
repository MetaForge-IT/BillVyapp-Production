import type { Appointment } from "./boardTypes";

export type TimelineBoardProps = {
  filteredAppts: Appointment[];
  paginatedAppts: Appointment[];
  apptsPagination: {
    page: number;
    pageSize: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
  focusAppointmentId: string | null;
  expandedServices: Set<string>;
  setExpandedServices: React.Dispatch<React.SetStateAction<Set<string>>>;
  setCustomerInfoAppt: (appt: Appointment | null) => void;
  startAppointment: (id: string) => void;
  setDeleteConfirm: (id: string | null) => void;
  openBilling: (id: string, name: string, service: string) => void;
  setCorrectionAppt: (appt: { id: string; service: string } | null) => void;
};
