import type { Customer, CreateCustomerPayload } from "../api/customers";

export function customerToApiPayload(
  customer: Pick<
    Customer,
    "name" | "phone" | "email" | "gender" | "birthday" | "address" | "notes" | "status" | "gstin"
  >,
): CreateCustomerPayload {
  return {
    fullName: customer.name,
    phone: customer.phone,
    email: customer.email || undefined,
    gender: customer.gender,
    dateOfBirth: customer.birthday || undefined,
    address: customer.address || undefined,
    notes: customer.notes || undefined,
    gstin: customer.gstin || undefined,
    status: customer.status,
  };
}
