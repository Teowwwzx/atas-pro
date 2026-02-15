"use client"
import '@/app/(public)/experts/experts.css'
import { PublicNavbar } from '@/components/ui/PublicNavbar'
import Link from 'next/link'

export default function AboutPage() {
    return (
        <div className="experts-page-wrapper">
            <div className="noise" />
            <PublicNavbar />

            <div className="pt-32 pb-20 px-6 max-w-5xl mx-auto text-center">
                <div className="hero-badge mb-8 mx-auto" style={{ borderColor: '#FFD700', color: '#FFD700' }}>
                    About ATAS
                </div>
                <h1 className="hero-title font-display mb-8">
                    Bridging academia <br /> & industry.
                </h1>
                <p className="hero-desc mx-auto">
                    We are on a mission to democratize access to industry expertise for every university student in Southeast Asia.
                </p>
            </div>

            {/* Content Cards */}
            <div className="px-6 pb-32 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="expert-card-glass p-12 text-left items-start">
                        <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-3xl mb-6 text-yellow-500 border border-yellow-500/30">
                            🚀
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            To empower student organizers with the tools they need to run world-class events, and to provide industry experts a platform to give back and scout talent efficiently.
                        </p>
                    </div>

                    <div className="expert-card-glass p-12 text-left items-start">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-3xl mb-6 text-blue-500 border border-blue-500/30">
                            🤝
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">The Ecosystem</h2>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            We connect 500+ universities with top tech companies. Students get mentorship, companies get branding, and universities get engagement.
                        </p>
                    </div>
                </div>

                <div className="mt-20 p-12 rounded-[2rem] border border-white/10 bg-white/5 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-yellow-500/10 to-purple-500/10 opacity-50" />
                    <h2 className="text-4xl font-display font-bold text-white mb-6 relative z-10">Join the movement</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto mb-10 relative z-10">
                        Whether you are a student leader, an industry veteran, or a forward-thinking brand.
                    </p>
                    <div className="flex justify-center gap-4 relative z-10">
                        <Link href="/register" className="px-8 py-4 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors">
                            Get Started
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
