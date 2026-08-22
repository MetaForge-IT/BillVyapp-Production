export type ReceiptLineItem = {
  name: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
};

/** Line items for receipt display — uses API amounts when available. */
export function receiptLinesForDisplay(
  lineItems: ReceiptLineItem[] | undefined,
  services: string[],
  subtotal: number,
): ReceiptLineItem[] {
  if (lineItems?.length) {
    return lineItems;
  }

  if (!services.length) {
    return [{ name: "Services", amount: subtotal }];
  }

  if (services.length === 1) {
    return [{ name: services[0], amount: subtotal }];
  }

  const per = Math.round(subtotal / services.length);
  return services.map((name, i) => ({
    name,
    amount:
      i === services.length - 1 ? subtotal - per * (services.length - 1) : per,
  }));
}
