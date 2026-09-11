import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:opacity-50"
    const variants: any = {
      default: "bg-[#D4AF37] text-[#001726] hover:bg-[#c19b2e]",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline: "border border-[#1e293b] bg-transparent hover:bg-[#001726] text-[#94a3b8]",
      ghost: "hover:bg-[#001726] text-[#94a3b8]",
    }
    const sizes: any = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-11 px-8",
    }
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
