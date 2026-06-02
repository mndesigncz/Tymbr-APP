import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, color, className, dot }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium", className)}
      style={color ? { backgroundColor: `${color}18`, color } : undefined}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={color ? { backgroundColor: color } : undefined} />
      )}
      {children}
    </span>
  );
}
