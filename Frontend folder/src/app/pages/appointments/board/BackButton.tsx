import { Button } from "../../../components/ui/button";
import { ArrowLeft } from "lucide-react";

// Back button component used across sub-pages
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="flex items-center gap-1 rounded-xl border-[#d4af37]/40 hover:bg-amber-50">
      <ArrowLeft className="h-4 w-4" /> Back
    </Button>
  );
}
