'use client'

import React from 'react'

interface RoleSelectorProps {
    onSelectRole: (role: 'student' | 'expert') => void
}

export function RoleSelector({ onSelectRole }: RoleSelectorProps) {
    return (
        <div className="text-center space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-primary-600 mb-2">Choose Your Path</h2>
                <p className="text-gray-600 text-lg">Join our platform as a Student or an Expert</p>
            </div>
            <div className="flex flex-col md:flex-row justify-center gap-6 mt-8">
                <button
                    onClick={() => onSelectRole('student')}
                    className="bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg flex flex-col items-center space-y-2"
                >
                    <span className="text-xl">I&apos;m a Student</span>
                    <span className="text-sm opacity-80">Looking for expert guidance</span>
                </button>
                <button
                    onClick={() => onSelectRole('expert')}
                    className="bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg flex flex-col items-center space-y-2"
                >
                    <span className="text-xl">I&apos;m an Expert</span>
                    <span className="text-sm opacity-80">Ready to share my knowledge</span>
                </button>
            </div>
        </div>
    )
}
