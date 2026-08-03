export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function last10(value: string): string {
  const d = digitsOnly(value);
  return d.length >= 10 ? d.slice(-10) : d;
}

export function mapTier(slug: string): string {
  if (slug === "platinum") return "VIP";
  if (slug === "gold") return "Gold";
  if (slug === "silver") return "Silver";
  return "Regular";
}

export function customerInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}
