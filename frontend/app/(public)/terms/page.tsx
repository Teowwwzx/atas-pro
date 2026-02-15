"use client"
import '@/app/(public)/experts/experts.css'
import { PublicNavbar } from '@/components/ui/PublicNavbar'

export default function TermsPage() {
    return (
        <div className="experts-page-wrapper">
            <div className="noise" />
            <PublicNavbar />

            <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
                <h1 className="text-4xl font-display font-bold text-white mb-8">Terms of Service</h1>

                <div className="legal-content text-gray-300 space-y-8 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>By accessing and using the ATAS Platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. User Conduct</h2>
                        <p>You agree to use the Service only for lawful purposes. You are solely responsible for the knowledge of and adherence to any and all laws, rules, and regulations pertaining to your use of the Service.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Intellectual Property</h2>
                        <p>All content included on this site, such as text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, is the property of ATAS or its content suppliers and protected by international copyright laws.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Termination</h2>
                        <p>We may terminate your access to the Service, without cause or notice, which may result in the forfeiture and destruction of all information associated with your account.</p>
                    </section>
                </div>
            </div>
        </div>
    )
}
