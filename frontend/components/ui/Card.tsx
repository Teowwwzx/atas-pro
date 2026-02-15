"use client"

import * as React from "react"

type CardProps = {
  title?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Card({ title, actions, children, className }: CardProps) {
  return (
    <section
      className={[
        "rounded-md border bg-white shadow-sm",
        "border-gray-200 dark:border-gray-800",
        "dark:bg-gray-900",
        className,
      ].filter(Boolean).join(" ")}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
          {title && <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export default Card