import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "../ui/command";
import { searchGlobal, type SearchResult } from "../../../api/search";
import {
  Users, Calendar, Scissors, Receipt, UserCircle, Package, BarChart3, Search, Loader2,
} from "lucide-react";

const typeIcons: Record<string, typeof Users> = {
  customer: Users,
  appointment: Calendar,
  service: Scissors,
  invoice: Receipt,
  Customer: Users,
  Appointment: Calendar,
  Service: Scissors,
  Bill: Receipt,
  Employee: UserCircle,
  Inventory: Package,
  Report: BarChart3,
};

function resultMeta(result: SearchResult): string {
  if (result.type === "customer" && result.meta.phone) return String(result.meta.phone);
  if (result.type === "appointment" && result.meta.date) return String(result.meta.date);
  if (result.type === "service" && result.meta.price != null) {
    return `₹${Number(result.meta.price).toLocaleString("en-IN")}`;
  }
  if (result.type === "invoice" && result.meta.receiptNumber) {
    return String(result.meta.receiptNumber);
  }
  return result.type;
}

function resultTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchGlobal(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden flex items-center justify-center h-10 w-10 rounded-xl border border-[#D4AF37]/25 bg-white hover:border-[#D4AF37]/40 hover:bg-[#FAF8F2] transition-all"
        aria-label="Search"
      >
        <Search className="h-4 w-4 text-[#3f3f46]" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-10 px-3 lg:px-4 rounded-xl border border-[#D4AF37]/25 bg-white text-sm text-[#3f3f46] hover:border-[#D4AF37]/45 hover:bg-[#FAF8F2] transition-all min-w-0 sm:min-w-[180px] lg:min-w-[320px] shadow-sm hover:shadow-md max-w-[320px]"
      >
        <Search className="h-4 w-4 shrink-0 text-[#3f3f46]" />
        <span className="flex-1 text-left text-inter-regular">Search anything...</span>
        <kbd className="hidden lg:inline-flex h-6 items-center gap-1 rounded-md border border-[#D4AF37]/20 bg-[#FAF8F2] px-2 text-[10px] font-medium text-[#3f3f46]">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search customers, appointments, bills..."
          className="text-inter-regular"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#3f3f46]">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching...
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <CommandEmpty className="text-inter-regular">No results found.</CommandEmpty>
          )}
          {!loading && results.length > 0 && (
            <CommandGroup heading="Results">
              {results.map((item) => {
                const Icon = typeIcons[item.type] || Search;
                return (
                  <CommandItem
                    key={`${item.type}-${item.href}-${item.label}`}
                    onSelect={() => {
                      navigate(item.href);
                      setOpen(false);
                    }}
                    className="group"
                  >
                    <Icon className="h-4 w-4 text-[#D4AF37] group-hover:text-[#121212] transition-colors" />
                    <div className="flex flex-col">
                      <span className="text-inter-medium">{item.label}</span>
                      <span className="text-xs text-inter-regular text-[#3f3f46]">{resultMeta(item)}</span>
                    </div>
                    <CommandShortcut className="text-[10px] text-inter-regular text-[#3f3f46]">
                      {resultTypeLabel(item.type)}
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { navigate("/dashboard"); setOpen(false); }} className="text-inter-medium">Dashboard</CommandItem>
            <CommandItem onSelect={() => { navigate("/appointments"); setOpen(false); }} className="text-inter-medium">Appointments</CommandItem>
            <CommandItem onSelect={() => { navigate("/finance?tab=receipts"); setOpen(false); }} className="text-inter-medium">Revenue Report</CommandItem>
            <CommandItem onSelect={() => { navigate("/reports"); setOpen(false); }} className="text-inter-medium">Reports</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
