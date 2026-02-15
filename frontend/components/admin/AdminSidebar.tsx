'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    DashboardIcon,
    PersonIcon,
    BackpackIcon,
    CalendarIcon,
    BookmarkIcon,
    BellIcon,
    ClipboardIcon,
    EnvelopeClosedIcon,
    PaperPlaneIcon,
    ExitIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    TableIcon
} from '@radix-ui/react-icons'
import { useRouter } from 'next/navigation'

import { useEffect, useState } from 'react'
import { getMe } from '@/services/api'
import { UserMeResponse } from '@/services/api.types'

const menuItems = [
    { name: 'Overview', href: '/admin', icon: DashboardIcon, roles: ['admin', 'customer_support', 'content_moderator'] },
    { name: 'Users', href: '/admin/users', icon: PersonIcon, roles: ['admin', 'customer_support'] },
    { name: 'Organizations', href: '/admin/organizations', icon: BackpackIcon, roles: ['admin', 'customer_support'] },
    { name: 'Events', href: '/admin/events', icon: CalendarIcon, roles: ['admin', 'content_moderator'] },
    { name: 'Categories', href: '/admin/categories', icon: BookmarkIcon, roles: ['admin'] },
    { name: 'Skills', href: '/admin/skills', icon: TableIcon, roles: ['admin'] },
    { name: 'Notifications', href: '/admin/notifications', icon: BellIcon, roles: ['admin'] },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardIcon, roles: ['admin'] },
    { name: 'Email Templates', href: '/admin/email-templates', icon: EnvelopeClosedIcon, roles: ['admin'] },
    { name: 'Communication Logs', href: '/admin/communications', icon: PaperPlaneIcon, roles: ['admin'] },
]

export function AdminSidebar() {
    const pathname = usePathname()
    // const router = useRouter() // Not used directly, using Link and window.location
    const [user, setUser] = useState<UserMeResponse | null>(null)
    const [isCollapsed, setIsCollapsed] = useState(false)

    useEffect(() => {
        getMe().then(setUser).catch(console.error)
    }, [])

    if (!user) return null

    const userRoles = user.roles || []

    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-gray-100 min-h-screen flex flex-col sticky top-0 h-screen font-sans transition-all duration-300 relative`}>

            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 shadow-sm z-50 transition-colors"
            >
                {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
            </button>

            <div className={`p-8 pb-6 ${isCollapsed ? 'px-4 justify-center' : ''} flex`}>
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : 'px-2'}`}>
                    <div className="w-10 h-10 min-w-[2.5rem] bg-yellow-400 rounded-xl flex items-center justify-center shadow-sm">
                        <span className="font-black text-xl text-zinc-900">A</span>
                    </div>
                    {!isCollapsed && (
                        <div className="animate-fadeIn">
                            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">ATAS</h1>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin Panel</span>
                        </div>
                    )}
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden">
                {!isCollapsed && <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 animate-fadeIn">Menu</div>}

                {menuItems.filter(item => item.roles.some(r => userRoles.includes(r))).map((item) => {
                    const isActive = pathname.startsWith(item.href) && (item.href === '/admin' ? pathname === '/admin' : true)
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={isCollapsed ? item.name : ''}
                            className={`group flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-3.5'} text-sm font-medium rounded-2xl transition-all duration-200 ${isActive
                                ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/10'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            {!isCollapsed && <span className="animate-fadeIn">{item.name}</span>}
                        </Link>
                    )
                })}
            </nav>

            <div className={`p-4 border-t border-gray-100 bg-gray-50/50 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center p-0 mb-4' : 'px-4 py-3 mb-2'} bg-white rounded-2xl border border-gray-100 shadow-sm ${!isCollapsed ? 'w-full' : 'w-10 h-10 p-0'}`}>
                    <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {user.email.substring(0, 2).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 animate-fadeIn">
                            <p className="text-sm font-bold text-gray-900 truncate">{user.full_name || 'Admin User'}</p>
                            <p className="text-xs text-gray-500 truncate capitalize">
                                {userRoles.includes('admin') ? 'Administrator' :
                                    userRoles.includes('customer_support') ? 'Support Agent' :
                                        userRoles.includes('content_moderator') ? 'Moderator' : 'Staff'}
                            </p>
                        </div>
                    )}
                </div>

                <button
                    onClick={async () => {
                        if (confirm('Are you sure you want to logout?')) {
                            localStorage.removeItem('atas_token')
                            window.location.href = '/admin/login'
                        }
                    }}
                    title={isCollapsed ? "Logout" : ""}
                    className={`flex items-center justify-center ${isCollapsed ? 'w-10 h-10 rounded-full' : 'w-full px-4 py-3 rounded-xl'} text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors`}
                >
                    <ExitIcon className={`w-4 h-4 ${!isCollapsed ? 'mr-2' : ''}`} />
                    {!isCollapsed && "Logout"}
                </button>
            </div>
        </div>
    )
}
