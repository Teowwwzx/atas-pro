'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { BellIcon } from '@radix-ui/react-icons'
import { adminService } from '@/services/admin.service'

export function AdminNotificationBell() {
  // Disabled: No events currently trigger admin notifications
  // TODO: Re-enable when admin notification triggers are implemented
  return (
    <div className="relative">
      <button
        aria-label="Notifications (Coming Soon)"
        disabled
        className="relative p-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
        title="Admin notifications coming soon"
      >
        <BellIcon className="w-5 h-5" />
      </button>
    </div>
  )
}

