"use client"
import '@/app/(public)/experts/experts.css'
import { PublicNavbar } from '@/components/ui/PublicNavbar'

export default function PrivacyPage() {
    return (
        <div className="experts-page-wrapper">
            <div className="noise" />
            <PublicNavbar />

            <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
                <h1 className="text-4xl font-display font-bold text-white mb-8">Privacy Policy</h1>

                <div className="legal-content text-gray-300 space-y-8 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Data Collection</h2>
                        <p>We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Use of Information</h2>
                        <p>We use the information we collect to provide, maintain, and improve our services, such as to facilitate payments, send receipts, provide products and services you request (and send related information), develop new features, provide customer support to Users and Drivers, develop safety features, authenticate users, and send product updates and administrative messages.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Sharing of Information</h2>
                        <p>We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including as follows: with third party Service Providers to enable them to provide the Services you request.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">Security</h2>
                        <p>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>
                    </section>
                </div>
            </div>
        </div>
    )
}
