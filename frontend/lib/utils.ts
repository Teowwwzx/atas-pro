
import { AxiosError } from 'axios'
import { toast } from 'react-hot-toast'

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  const err = error as AxiosError<{ detail?: string }>
  return err?.response?.data?.detail || err?.message || fallback
}

export function toastError(error: unknown, id?: string, fallback?: string) {
  const msg = getApiErrorMessage(error, fallback)
  toast.error(msg, id ? { id } : undefined)
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
