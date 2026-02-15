import React from 'react'

interface SponsorBadgeProps {
    tier: string
    size?: 'sm' | 'md' | 'lg'
}

export function SponsorBadge({ tier, size = 'md' }: SponsorBadgeProps) {
    if (!tier) return null

    const getTierConfig = (tier: string) => {
        switch (tier.toLowerCase()) {
            case 'gold':
                return {
                    outerRing: 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 shadow-[0_4px_10px_rgba(234,179,8,0.5)]',
                    innerFace: 'bg-gradient-to-br from-yellow-100 to-yellow-400',
                    icon: (
                        <svg className="w-[60%] h-[60%] text-yellow-700 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V17H19V19Z" />
                        </svg>
                    ),
                    labelColor: 'text-yellow-700',
                    glow: 'shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse'
                }
            case 'silver':
                return {
                    outerRing: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 shadow-[0_4px_10px_rgba(156,163,175,0.5)]',
                    innerFace: 'bg-gradient-to-br from-gray-100 to-gray-300',
                    icon: (
                        <svg className="w-[60%] h-[60%] text-gray-700 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15Z" />
                            <path d="M9.36998 16.55L7.96998 17.56L9.58998 19.8L10.99 18.79C11.31 18.88 11.65 18.93 12 18.93C12.35 18.93 12.69 18.88 13.01 18.79L14.41 19.8L16.03 17.56L14.63 16.55C15.68 15.69 16.48 14.52 16.89 13.19L19.53 13.65L19.88 10.91L17.24 10.45C17.06 9.5 16.71 8.62002 16.22 7.84002L18.25 6.14002L16.32 3.84002L14.29 5.54002C13.61 5.19002 12.83 4.93002 12 4.93002C11.17 4.93002 10.39 5.19002 9.70998 5.54002L7.67998 3.84002L5.74998 6.14002L7.77998 7.84002C7.28998 8.62002 6.93998 9.5 6.75998 10.45L4.11998 10.91L4.46998 13.65L7.10998 13.19C7.51998 14.52 8.31998 15.69 9.36998 16.55ZM12 7.00002C14.76 7.00002 17 9.24002 17 12C17 14.76 14.76 17 12 17C9.23998 17 6.99998 14.76 6.99998 12C6.99998 9.24002 9.23998 7.00002 12 7.00002Z" />
                        </svg>
                    ),
                    labelColor: 'text-gray-700',
                    glow: 'shadow-[0_0_15px_rgba(209,213,219,0.5)]'
                }
            case 'bronze':
                return {
                    outerRing: 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 shadow-[0_4px_10px_rgba(146,64,14,0.5)]',
                    innerFace: 'bg-gradient-to-br from-amber-600 to-amber-800',
                    icon: (
                        <svg className="w-[60%] h-[60%] text-amber-100 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15Z" />
                            <path d="M12 2L9.12001 5.86001L4.32001 6.14001L6.96001 9.68001L5.56001 14.28L9.70001 15.54L12 19.78L14.3 15.54L18.44 14.28L17.04 9.68001L19.68 6.14001L14.88 5.86001L12 2ZM12 17C9.24001 17 7.00001 14.76 7.00001 12C7.00001 9.24001 9.24001 7.00001 12 7.00001C14.76 7.00001 17 9.24001 17 12C17 14.76 14.76 17 12 17Z" />
                        </svg>
                    ),
                    labelColor: 'text-amber-900',
                    glow: 'shadow-[0_0_15px_rgba(180,83,9,0.4)]'
                }
            default:
                return null
        }
    }

    const config = getTierConfig(tier)
    if (!config) return null

    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    }

    return (
        <div className={`relative flex items-center justify-center rounded-full ${sizeClasses[size]} ${config.outerRing} ${config.glow} transform transition-transform hover:scale-110 duration-300`}>
            {/* 3D Reflection Highlight */}
            <div className="absolute top-0 left-0 w-full h-full rounded-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
            
            {/* Inner Face */}
            <div className="absolute inset-[15%] rounded-full shadow-inner flex items-center justify-center ${config.innerFace}">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-white/10 to-black/10 flex items-center justify-center">
                   {config.icon}
                </div>
            </div>
            
            {/* Shine Animation */}
            {tier.toLowerCase() === 'gold' && (
                <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-12 animate-shine"></div>
                </div>
            )}
        </div>
    )
}
