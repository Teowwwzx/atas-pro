'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PublicNavbar } from '@/components/ui/PublicNavbar'
import './landing.css'

// Import Three.js and GSAP dynamically to avoid SSR issues if necessary, 
// but standard import usually works with 'use client'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function HomePage() {
    const router = useRouter()
    const canvasRef = useRef<HTMLDivElement>(null)
    const [hasToken, setHasToken] = useState<boolean | null>(null)
    const shuttleRef = useRef<THREE.Sprite | null>(null)

    // Token check logic - just track state, don't redirect
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('atas_token')
                setHasToken(token ? true : false)
            }
        } catch {
            setHasToken(false)
        }
    }, [router])

    // Three.js Animation Effect
    useEffect(() => {
        if (!canvasRef.current) return

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })

        renderer.setSize(window.innerWidth, window.innerHeight)
        // Clear previous canvas if any
        if (canvasRef.current.firstChild) {
            canvasRef.current.removeChild(canvasRef.current.firstChild)
        }
        canvasRef.current.appendChild(renderer.domElement)

        // Helper to create Text Sprite (Simulating 3D Emojis)
        function createEmojiSprite(emoji: string, x: number, y: number, z: number, size: number, opacity = 0.8) {
            const canvas = document.createElement('canvas')
            canvas.width = 128; canvas.height = 128
            const context = canvas.getContext('2d')
            if (context) {
                context.font = '100px Arial'
                context.textAlign = 'center'
                context.textBaseline = 'middle'
                context.fillText(emoji, 64, 64)
            }

            const texture = new THREE.CanvasTexture(canvas)
            const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: opacity })
            const sprite = new THREE.Sprite(material)
            sprite.position.set(x, y, z)
            sprite.scale.set(size, size, 1)
            return sprite
        }

        const emojis = ['🚀', '🎓', '🏸', '💻', '🎨', '⚡', '🏆', '📚']
        const particles: THREE.Sprite[] = []

        // Create scattered emojis
        for (let i = 0; i < 30; i++) {
            const emoji = emojis[Math.floor(Math.random() * emojis.length)]
            const x = (Math.random() - 0.5) * 60
            const y = (Math.random() - 0.5) * 40
            const z = (Math.random() - 0.5) * 15
            const size = Math.random() * 0.8 + 0.5
            const opacity = Math.random() * 0.4 + 0.4

            const sprite = createEmojiSprite(emoji, x, y, z, size, opacity)

            // @ts-ignore - custom user data
            sprite.userData = {
                speedY: Math.random() * 0.02 + 0.005,
                speedX: Math.random() * 0.02 - 0.01,
                originalY: y
            }

            scene.add(sprite)
            particles.push(sprite)
        }

        // Hero Shuttlecock
        const heroShuttle = createEmojiSprite('🏸', 10, 5, 0, 1.8, 0.9)
        scene.add(heroShuttle)
        shuttleRef.current = heroShuttle

        camera.position.z = 10

        let mouseX = 0, mouseY = 0
        let scrollY = 0

        const handleScroll = () => { scrollY = window.scrollY }
        const handleMouseMove = (e: MouseEvent) => {
            mouseX = (e.clientX - window.innerWidth / 2) * 0.1
            mouseY = (e.clientY - window.innerHeight / 2) * 0.1
        }
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
        }

        window.addEventListener('scroll', handleScroll)
        document.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('resize', handleResize)

        const animate = () => {
            requestAnimationFrame(animate)

            particles.forEach(p => {
                // @ts-ignore
                const initialY = p.userData.originalY || p.position.y

                // Floating motion
                p.position.y = initialY + Math.sin(Date.now() * 0.001 + p.position.x) * 0.5

                // Subtle Parallax: Move slightly based on mouse position
                const targetX = p.position.x + (mouseX * 0.005)
                const targetY = initialY + (mouseY * 0.005)

                // Direct gentle assignment instead of accumulation
                p.position.x = p.userData.speedX ? p.position.x + p.userData.speedX : p.position.x
                if (p.position.x > 30) p.position.x = -30
                if (p.position.x < -30) p.position.x = 30

                // Smoothly interpolate current position towards the parallax target
                // Note: We need to store original X too if we want true parallax, 
                // but for now, just adding a small drift based on mouse is safer than accumulation.
                // Better approach: Just apply the mouse offset directly to the base position in the render loop
                // rather than accumulating it. To do this, we need to know the 'base' X.

                // Let's rely on the sprite's initial random placement as 'base' implicitly for now
                // by determining drift from a "center".
                // Since we didn't store base X, let's just apply a small force but DAMP it heavily
                // or simply rotate them slightly.

                // FIXED LOGIC:
                // 1. Float up/down
                // 2. Move slightly away from mouse (repulsion) or just move WITH mouse (parallax)

                // Simple Parallax:
                // p.translateX((mouseX * 0.01 - p.position.x) * 0.001) <--- This was the bug (accumulation to center)

                // New logic: Just float. 
                // If we want mouse interaction, we'll modify the camera or rotate the whole group, 
                // but individually modifying position without a base reference causes drift.

                // Let's just do gentle floating + constant slow drift that wraps around?
                // Or just keep the floating, it's elegant enough.

                // Let's add a very subtle mouse influence that doesn't accumulate:
                // We can't easily undo the previous accumulation without resetting, 
                // but since this is a frame loop, let's just do pure floating for stability.

            })

            // Hero Shuttle Physics (Scroll Interaction)
            if (shuttleRef.current) {
                shuttleRef.current.position.y = 3 - (scrollY * 0.01)
                shuttleRef.current.position.x = 5 - (scrollY * 0.005)
                shuttleRef.current.position.z = Math.sin(scrollY * 0.005) * 2
            }

            renderer.render(scene, camera)
        }
        animate()

        return () => {
            window.removeEventListener('scroll', handleScroll)
            document.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('resize', handleResize)
            if (canvasRef.current && canvasRef.current.contains(renderer.domElement)) {
                canvasRef.current.removeChild(renderer.domElement)
            }
            renderer.dispose()
        }
    }, [])

    // GSAP Animations
    useEffect(() => {
        // Hero Reveal
        const tl = gsap.timeline()
        tl.to('.hero-tag', { opacity: 1, y: 0, duration: 0.8 })
            .to('.hero-title .word', {
                y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power4.out"
            }, "-=0.5")
            .to('.hero-desc', { opacity: 1, y: 0, duration: 1 }, "-=0.8")
            .to('.hero-btns', { opacity: 1, y: 0, duration: 1 }, "-=0.8")

        // Bento Cards Reveal
        const cards = document.querySelectorAll('.bento-card')
        cards.forEach((card, i) => {
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: "top 85%"
                },
                y: 50, opacity: 0, duration: 0.8, delay: i * 0.1
            })
        })
    }, [])

    // Code Typing Effect
    useEffect(() => {
        const codeEl = document.getElementById('code-content')
        if (!codeEl) return

        const codeString = `function buildFuture() {\n  const skills = ["AI", "Web3"];\n  const network = connect(experts);\n  return launchCareer(skills);\n}`
        let charIndex = 0

        function typeCode() {
            if (!codeEl) return
            if (charIndex < codeString.length) {
                codeEl.innerText += codeString.charAt(charIndex)
                charIndex++
                setTimeout(typeCode, 50)
            } else {
                setTimeout(() => {
                    codeEl.innerText = ""
                    charIndex = 0
                    typeCode()
                }, 3000)
            }
        }

        ScrollTrigger.create({
            trigger: ".card-lg",
            start: "top 70%",
            onEnter: () => {
                if (codeEl.innerText === "") typeCode()
            }
        })
    }, [])

    return (
        <div className="landing-page-wrapper">
            {/* Visual Backgrounds */}
            <div className="noise" />
            <div className="ambient-light" />
            <div id="webgl-canvas" ref={canvasRef} />

            {/* NEW PUBLIC NAVBAR */}
            <PublicNavbar />

            <main>
                {/* HERO */}
                <section className="section-hero">
                    <div className="hero-tag opacity-0 translate-y-4">
                        <i className="fas fa-bolt mr-2"></i> The Student Ecosystem
                    </div>
                    <h1 className="hero-title font-display">
                        <span className="word">Unlock</span> <span className="word">Your</span> <br />
                        <span className="word text-accent">Full</span> <span className="word">Potential</span>
                    </h1>
                    <p className="hero-desc">
                        The all-in-one platform for university events, expert connections, and career-building.
                        Stop studying in a silo. Start building your future.
                    </p>

                    <div className="hero-btns">
                        <Link href="/register" className="btn-primary">Get Started Free</Link>
                    </div>
                </section>

                {/* STATS TICKER */}
                <div className="stats-ticker">
                    <div className="ticker-wrap">
                        <span className="ticker-item">500+ UNIVERSITIES</span>
                        <span className="ticker-item highlight">12K+ STUDENTS</span>
                        <span className="ticker-item">850+ EXPERTS</span>
                        <span className="ticker-item highlight">LIVE PORTFOLIOS</span>
                        <span className="ticker-item">500+ UNIVERSITIES</span>
                        <span className="ticker-item highlight">12K+ STUDENTS</span>
                        <span className="ticker-item">850+ EXPERTS</span>
                        <span className="ticker-item highlight">LIVE PORTFOLIOS</span>
                    </div>
                </div>

                {/* BENTO GRID (Student Life) */}
                <section className="section-bento">
                    <div className="bento-header">
                        <h2 className="font-display">Student Life <span style={{ color: 'var(--accent-green)' }}>Reimagined</span></h2>
                        <p>Everything you need to succeed, organized in one beautiful interface.</p>
                    </div>

                    <div className="bento-grid">

                        {/* Card 1: CS/Code */}
                        <div className="bento-card card-lg">
                            <div>
                                <div className="bento-icon">💻</div>
                                <h3 className="bento-title font-display">Build & Showcase</h3>
                                <p className="bento-desc">Participate in hackathons. Write code. Your activity automatically updates your verified portfolio.</p>
                            </div>
                            <div className="code-window">
                                <div id="code-content"></div>
                            </div>
                        </div>

                        {/* Card 2: Sports */}
                        <div className="bento-card card-tall">
                            <div className="badminton-court"></div>
                            <div>
                                <div className="bento-icon">🏸</div>
                                <h3 className="bento-title font-display">Active Lifestyle</h3>
                                <p className="bento-desc">Join badminton clubs, organize tournaments, and track matches.</p>
                            </div>
                            <div style={{ marginTop: 'auto', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                {/* <i className="fas fa-arrow-down" style={{ fontSize: '2rem' }}></i> */}
                                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                        </div>

                        {/* Card 3: Events */}
                        <div className="bento-card">
                            <div className="bento-icon">🎫</div>
                            <h3 className="bento-title font-display">EventOS</h3>
                            <p className="bento-desc">Ticketing, check-ins, and certificates for your club events.</p>
                        </div>

                        {/* Card 4: Networking */}
                        <div className="bento-card">
                            <div className="bento-icon">🤝</div>
                            <h3 className="bento-title font-display">Expert Access</h3>
                            <p className="bento-desc">Direct line to industry mentors.</p>
                        </div>

                    </div>
                </section>

                {/* BROWSE EXPERTS CTA */}
                <section style={{
                    padding: '6rem 4rem',
                    margin: '0 4rem',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))',
                    borderRadius: '40px',
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 20
                }}>
                    <h2 className="text-5xl font-display font-bold mb-4">
                        Meet <span style={{ color: 'var(--accent-purple)' }}>Expert Speakers</span>
                    </h2>
                    <p className="text-xl mb-6 max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
                        500+ industry professionals ready to share knowledge. Browse available experts and book sessions instantly.
                    </p>
                    <Link href="/experts" className="btn-primary" style={{ fontSize: '1.1rem', padding: '1.2rem 3rem' }}>
                        Browse All Experts →
                    </Link>
                </section>

                {/* EXPERT SECTION */}
                <section className="section-split">
                    <div className="split-content">
                        <h2 className="font-display">For The <span className="text-highlight-purple">Visionaries</span></h2>
                        <p>Join a network of industry leaders giving back to the next generation. Share your knowledge, build your personal brand, and scout top talent early.</p>

                        <div className="expert-card">
                            <div className="expert-icon">🎤</div>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.2rem' }}>Share Wisdom</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Speak at universities and host workshops.</p>
                            </div>
                        </div>

                        <div className="expert-card">
                            <div className="expert-icon">🚀</div>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.2rem' }}>Build Legacy</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Mentor students and shape future leaders.</p>
                            </div>
                        </div>

                        <Link href="/register?role=expert" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Join as Expert</Link>
                    </div>
                    <div style={{ position: 'relative', height: '100%', minHeight: '400px', borderRadius: '24px', overflow: 'hidden' }}>
                        <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} alt="Expert Visionary" />
                    </div>
                </section>

                {/* SPONSOR SECTION */}
                <section className="section-split">
                    {/* Note: In React, we can't easily adhere to the mixed 'direction' style easily for visual reversal without confusing screen readers sometimes, so I'll just swap grid columns in CSS or order if needed, but here simple order swap in JSX is fine for layout. */}

                    <div className="hidden lg:flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '100%', height: '400px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            {/* Globe Icon Placeholder */}
                            <svg className="w-40 h-40 text-blue-500 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 18v-1.938a2 2 0 001.152-3.085l-1.096-1.096A4.965 4.965 0 0010 10a2 2 0 00-1.414.586l-1.333 1.333a2 2 0 00-.586 1.414v1.516A6.002 6.002 0 014.332 8.027z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    <div className="split-content">
                        <h2 className="font-display">Power the <span className="text-highlight-blue">Future</span></h2>
                        <p>Connect your brand with the most ambitious students across 500+ universities. Sponsorship that drives real engagement and hiring results.</p>

                        <div className="sponsor-grid">
                            <div className="sponsor-box"><h3>GOOGLE</h3></div>
                            <div className="sponsor-box"><h3>MICROSOFT</h3></div>
                            <div className="sponsor-box"><h3>GRAB</h3></div>
                            <div className="sponsor-box"><h3>PETRONAS</h3></div>
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                            <a href="#" className="btn-secondary">Become a Partner</a>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer>
                    <div className="footer-cta">
                        <h2 className="font-display">Ready to be a <br /><span className="text-accent">Champion?</span></h2>
                        <Link href="/register" className="btn-primary">Join the Network</Link>
                    </div>
                    <div className="socials">
                        {/* Placeholder Social Icons */}
                        <span>IG</span>
                        <span>LI</span>
                        <span>X</span>
                    </div>
                    <div className="flex gap-4 justify-center mt-8 text-sm text-zinc-500">
                        <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
                        <span>•</span>
                        <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
                    </div>
                    <p style={{ marginTop: '1rem', color: '#444', fontSize: '0.8rem' }}>© 2026 ATAS Platform. Designed for Excellence.</p>
                </footer>
            </main>
        </div>
    )
}
