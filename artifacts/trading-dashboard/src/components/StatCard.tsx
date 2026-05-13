import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
  valueClassName?: string;
}

export function StatCard({ title, value, sub, icon: Icon, trend, className, valueClassName }: StatCardProps) {
  return (
    <div className={cn("bg-card border border-card-border rounded-xl p-4 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
        )}
      </div>
      <div className={cn("text-2xl font-bold font-mono tracking-tight", valueClassName)}>
        {value}
      </div>
      {sub && (
        <div className={cn(
          "text-xs font-medium",
          trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
        )}>
          {sub}
        </div>
      )}
    </div>
  );
}
