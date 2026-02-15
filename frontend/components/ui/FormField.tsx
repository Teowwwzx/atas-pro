"use client"

import * as React from "react"

type FormFieldProps = {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: React.HTMLInputTypeAttribute
  placeholder?: string
  helpText?: string
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function FormField({ label, name, value, onChange, type = "text", placeholder, helpText, error, required, disabled, className }: FormFieldProps) {
  const id = name
  return (
    <div className={["space-y-1", className].filter(Boolean).join(" ")}> 
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{required ? " *" : ""}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="focus-ring block w-full rounded-sm border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm transition dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 motion-default"
      />
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-error-600 dark:text-error-400">{error}</p>
      )}
    </div>
  )
}

export default FormField