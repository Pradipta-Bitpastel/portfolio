import type { ElementType, ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type NeonVariant = "blue" | "purple" | "cyan" | "orange" | "green";

export interface NeonTextProps extends HTMLAttributes<HTMLElement> {
  variant?: NeonVariant;
  as?: ElementType;
  children?: ReactNode;
  className?: string;
}

const GRADIENTS: Record<NeonVariant, string> = {
  blue: "from-[#4f9cff] via-[#9b5cff] to-[#00d4ff]",
  purple: "from-[#9b5cff] via-[#4f9cff] to-[#00d4ff]",
  cyan: "from-[#00d4ff] via-[#4f9cff] to-[#9b5cff]",
  orange: "from-[#ff8a3c] via-[#9b5cff] to-[#4f9cff]",
  green: "from-[#39ffa5] via-[#00d4ff] to-[#4f9cff]"
};

/**
 * Gradient text primitive. Uses bg-clip-text + text-transparent with
 * a palette gradient driven by the `variant` prop. Polymorphic via
 * `as` so callers can render h1/h2/span/etc without wrapping.
 */
export function NeonText({
  variant = "blue",
  as,
  children,
  className,
  ...rest
}: NeonTextProps) {
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag
      {...rest}
      className={cn(
        "bg-gradient-to-r bg-clip-text text-transparent",
        GRADIENTS[variant],
        className
      )}
    >
      {children}
    </Tag>
  );
}

export default NeonText;
