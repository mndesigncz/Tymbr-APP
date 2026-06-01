import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const sizes = { sm: "w-6 h-6 text-xs", md: "w-8 h-8 text-sm", lg: "w-10 h-10 text-base" };

  if (src) {
    return (
      <div className={cn("rounded-full overflow-hidden flex-shrink-0", sizes[size], className)}>
        <Image src={src} alt={name} width={40} height={40} className="w-full h-full object-cover" />
      </div>
    );
  }

  const colors = [
    "bg-orange-500", "bg-blue-500", "bg-green-500", "bg-purple-500",
    "bg-pink-500", "bg-yellow-500", "bg-teal-500",
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0",
        sizes[size],
        colors[colorIdx],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
