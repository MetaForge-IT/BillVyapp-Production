import { useRole, roleConfig, type UserRole } from "../../context/RoleContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className="px-3 py-3 mx-3 mb-2 rounded-xl bg-white border border-[#D4AF37]/20">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Viewing as</p>
      <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
        <SelectTrigger className="w-full border-[#D4AF37]/25 bg-[#FAF8F2] rounded-xl h-10 text-[#121212]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(roleConfig) as UserRole[]).map((key) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <span>{roleConfig[key].emoji}</span>
                <span>{roleConfig[key].label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
