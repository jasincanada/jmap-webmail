import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            default:
              "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-sm hover:shadow",
            ghost: "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100",
            outline:
              "border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800 dark:hover:border-gray-500 dark:text-gray-100",
          }[variant],
          {
            sm: "h-9 px-3 text-sm",
            md: "h-10 px-4 py-2",
            lg: "h-11 px-8",
            icon: "h-10 w-10",
          }[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };