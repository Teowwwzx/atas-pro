"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMe } from "@/services/api"
import { useUser } from "@/hooks/useUser"
import useSWR from "swr"

export function useAuthGuard(requiredRoles?: string[], redirectOnDenied: boolean = true, loginPath: string = '/login') {
  const router = useRouter()
  const { user, isLoading } = useUser()
  const [roles, setRoles] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: me, isLoading: meLoading } = useSWR('/users/me', () => getMe(), { revalidateOnFocus: false, dedupingInterval: 60000, shouldRetryOnError: false })

  useEffect(() => {
    const check = async () => {
      if (isLoading || meLoading) return
      if (!user) {
        router.push(loginPath)
        return
      }
      const rolesNow = me?.roles || []
      setRoles(rolesNow)
      if (requiredRoles && requiredRoles.length > 0) {
        const ok = rolesNow.some(r => requiredRoles.includes(r))
        if (!ok && redirectOnDenied) {
          router.push("/main")
          return
        }
      }
      setLoading(false)
    }
    check()
  }, [user, isLoading, me, meLoading, requiredRoles, redirectOnDenied, loginPath, router])

  return { user, roles, loading }
}
