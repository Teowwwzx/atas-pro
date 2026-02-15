"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    loading?: boolean
    icon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {

        const variants = {
            primary: "bg-zinc-900 text-yellow-400 hover:bg-zinc-800 hover:scale-105 shadow-md border-transparent",
            secondary: "bg-yellow-400 text-zinc-900 hover:bg-yellow-500 hover:scale-105 shadow-md border-transparent",
            outline: "bg-transparent border-2 border-zinc-200 text-zinc-900 hover:border-zinc-900",
            ghost: "bg-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
            danger: "bg-red-600 text-white hover:bg-red-700 shadow-md border-transparent"
        }

        const sizes = {
            sm: "px-3 py-1.5 text-xs font-bold",
            md: "px-5 py-2.5 text-sm font-bold",
            lg: "px-8 py-3 text-base font-bold",
            icon: "p-2"
        }

        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={cn(
                    "inline-flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {loading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {icon && !loading && <span className="mr-2">{icon}</span>}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
