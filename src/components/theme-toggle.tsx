import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="transition-transform duration-150 hover:rotate-12 active:scale-90"
    >
      <span key={dark ? "sun" : "moon"} className="animate-pop">
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </Button>
  );
}
