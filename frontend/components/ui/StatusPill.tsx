import { cn } from "@/lib/utils"

interface StatusPillProps {
    status: string
    variant?: 'success' | 'warning' | 'destructive' | 'secondary' | 'default'
    className?: string
}

export function StatusPill({ status, variant = 'default', className }: StatusPillProps) {
    const variants = {
        success: "bg-green-100 text-green-800 border-green-200",
        warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
        destructive: "bg-red-100 text-red-800 border-red-200",
        secondary: "bg-gray-100 text-gray-800 border-gray-200",
        default: "bg-blue-50 text-blue-700 border-blue-100"
    }

    // Auto-detect variant if not specified but status matches common keywords
    const detectedVariant = variant === 'default' ? (
        ['active', 'approved', 'published', 'verified', 'public'].includes(status.toLowerCase()) ? 'success' :
            ['pending', 'frozen', 'draft', 'private', 'closed'].includes(status.toLowerCase()) ? 'warning' :
                ['suspended', 'rejected', 'deleted', 'banned', 'declined'].includes(status.toLowerCase()) ? 'destructive' :
                    'secondary'
    ) : variant

    return (
        <span className={cn(
            "px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border",
            variants[detectedVariant],
            className
        )}>
            {status}
        </span>
    )
}
