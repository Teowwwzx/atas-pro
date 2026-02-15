import { IconProps } from '@radix-ui/react-icons/dist/types'
import { ForwardRefExoticComponent, RefAttributes } from 'react'

interface StatsCardProps {
    name: string
    value: string | number | undefined
    icon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>
    bg: string
    text: string
    trend?: string // Optional trend like "+5% from last week"
}

export function StatsCard({ name, value, icon: Icon, bg, text, trend }: StatsCardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{name}</p>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value ?? '-'}</h3>
                    {trend && (
                        <p className="text-xs font-medium text-green-600 mt-2 flex items-center">
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`p-4 rounded-xl ${bg} group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`w-6 h-6 ${text}`} />
                </div>
            </div>
        </div>
    )
}
