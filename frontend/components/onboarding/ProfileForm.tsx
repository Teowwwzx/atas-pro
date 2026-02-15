'use client'

import React, { useState } from 'react'
import { FormButton } from '@/components/auth/FormButton'

export function ProfileForm({
    role,
    onSubmit,
}: {
    role: 'student' | 'expert'
    onSubmit: (fullName: string) => void
}) {
    const [fullName, setFullName] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(fullName)
    }

    return (
        <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-primary-600">
                    Welcome, {role === 'student' ? 'Student' : 'Expert'}!
                </h2>
                <p className="text-gray-600 text-lg">
                    Let&#39;s create your profile to get started.
                </p>
            </div>

            <div className="mt-6">
                <label
                    htmlFor="full_name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    Full Name
                </label>
                <div>
                    <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-3 text-gray-900"
                    />
                </div>
            </div>

            {/* TODO: If role is 'expert', we will add more fields here 
        (e.g., Title, Company) per FRD.
        For now, 'full_name' is all that's required.
      */}

            <div className="mt-8">
                <FormButton>Complete Onboarding</FormButton>
            </div>
        </form>
    )
}
