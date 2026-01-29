import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const romanticButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-lg font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 animate-pulse-glow",
        secondary:
          "bg-secondary text-secondary-foreground border-2 border-accent hover:bg-accent hover:text-accent-foreground",
        gold:
          "gold-shimmer text-accent-foreground shadow-lg hover:shadow-xl hover:scale-105",
        outline:
          "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
        ghost:
          "text-primary hover:bg-primary/10",
        surprise:
          "bg-gradient-to-r from-primary via-rose to-accent text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 animate-pulse-glow",
      },
      size: {
        default: "h-14 px-8 py-4",
        sm: "h-10 px-4 py-2 text-base",
        lg: "h-16 px-10 py-5 text-xl",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface RomanticButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof romanticButtonVariants> {}

const RomanticButton = React.forwardRef<HTMLButtonElement, RomanticButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(romanticButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
RomanticButton.displayName = "RomanticButton";

export { RomanticButton, romanticButtonVariants };
