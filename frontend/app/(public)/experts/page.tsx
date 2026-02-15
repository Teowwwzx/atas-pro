"use client"
import './experts.css'
import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { discoverProfiles, semanticSearchProfiles, getSkills } from '@/services/api'
import { ProfileResponse } from '@/services/api.types'
import { ExpertCardGlass } from '@/components/ui/ExpertCardGlass'
import { PublicNavbar } from '@/components/ui/PublicNavbar'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP Plugin
if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
}

function ExpertsContent() {
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get('q') || ''
    const [experts, setExperts] = useState<ProfileResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [searchInput, setSearchInput] = useState(initialQuery)
    const [searchTerm, setSearchTerm] = useState(initialQuery)
    const [showFilters, setShowFilters] = useState(false)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [minRating, setMinRating] = useState<number>(0)
    const [availableSkills, setAvailableSkills] = useState<{ id: string, name: string }[]>([])

    // Refs for animation
    const heroRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const navbarRef = useRef<HTMLElement>(null)
    const filterRef = useRef<HTMLDivElement>(null)

    // Fetch Available Skills
    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const skills = await getSkills()
                setAvailableSkills(skills)
            } catch (error) {
                console.error('Failed to load skills:', error)
            }
        }
        fetchSkills()
    }, [])

    // Fetch Data
    useEffect(() => {
        const fetchExperts = async () => {
            setLoading(true)
            try {
                let data: ProfileResponse[] = []
                if (searchTerm.trim()) {
                    data = await semanticSearchProfiles({ q_text: searchTerm, role: 'expert' })
                } else {
                    // Default to showing only expert role on landing page
                    data = await discoverProfiles({ role: 'expert' })
                }
                setExperts(data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchExperts()
    }, [searchTerm])

    const handleSearch = () => {
        setSearchTerm(searchInput)
    }

    // --- THREE.JS BACKGROUND ---
    useEffect(() => {
        if (!canvasRef.current || typeof window === 'undefined') return

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })

        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Optimize

        // Clear previous canvas
        while (canvasRef.current.firstChild) {
            canvasRef.current.removeChild(canvasRef.current.firstChild)
        }
        canvasRef.current.appendChild(renderer.domElement)

        // Particles
        const geometry = new THREE.BufferGeometry()
        const count = 600
        const posArray = new Float32Array(count * 3)

        for (let i = 0; i < count * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 30
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
        const material = new THREE.PointsMaterial({
            size: 0.04,
            color: 0x666666,
            transparent: true,
            opacity: 0.6
        })

        const stars = new THREE.Points(geometry, material)
        scene.add(stars)
        camera.position.z = 6

        // Animation Loop
        let mouseX = 0
        let mouseY = 0

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2
        }
        window.addEventListener('mousemove', handleMouseMove)

        let animationId: number
        const animate = () => {
            animationId = requestAnimationFrame(animate)
            stars.rotation.y += 0.0005
            stars.rotation.x += 0.0002

            // Mouse Interaction
            stars.rotation.x += mouseY * 0.01
            stars.rotation.y += mouseX * 0.01

            renderer.render(scene, camera)
        }
        animate()

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('resize', handleResize)
            cancelAnimationFrame(animationId)
            if (renderer.domElement) {
                renderer.dispose();
            }
        }
    }, [])

    // --- GSAP ANIMATIONS ---
    useEffect(() => {
        if (loading) return

        // Hero Animations
        const ctx = gsap.context(() => {
            const tl = gsap.timeline()
            tl.from(".hero-badge", { y: -20, opacity: 0, duration: 0.8, ease: "power2.out" })
                .from(".hero-title", { y: 30, opacity: 0, duration: 1, ease: "power2.out" }, "-=0.6")
                .from(".hero-desc", { y: 20, opacity: 0, duration: 1, ease: "power2.out" }, "-=0.8")
                .fromTo(".search-container",
                    { y: 30, opacity: 0 },
                    { y: 0, opacity: 1, duration: 1, ease: "power2.out" }, "-=0.6"
                )

            // Scroll Reveal
            gsap.utils.toArray('.reveal').forEach((el: any) => {
                gsap.fromTo(el,
                    { y: 40, opacity: 0 },
                    {
                        scrollTrigger: {
                            trigger: el,
                            start: "top 85%",
                        },
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        ease: "power2.out"
                    }
                )
            })
        }, heroRef)

        return () => ctx.revert()
    }, [loading, experts]) // Re-run when data loads

    // Navbar Scroll Effect
    useEffect(() => {
        const handleScroll = () => {
            if (navbarRef.current) {
                if (window.scrollY > 50) navbarRef.current.classList.add('scrolled')
                else navbarRef.current.classList.remove('scrolled')
            }
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div className="experts-page-wrapper" ref={heroRef}>
            <div className="noise"></div>
            <div id="webgl-canvas" ref={canvasRef}></div>

            {/* Navbar */}
            {/* Navbar */}
            <PublicNavbar />

            {/* Hero */}
            <header className="expert-hero">
                <div className="hero-badge"><i className="fas fa-brain"></i> The Knowledge Network</div>
                <h1 className="hero-title font-display">Connect with<br />Industry Leaders</h1>
                <p className="hero-desc">Direct access to vetted professionals, mentors, and speakers who are shaping the future of technology and business.</p>

                <div className="search-container">
                    <i className="fas fa-search search-icon"></i>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Try 'Find Python expert available on weekends' or 'Design mentor for Monday'"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 ${showFilters ? 'bg-white/10' : ''}`}
                        title="Advanced Filters"
                    >
                        <i className="fas fa-sliders-h text-gray-400 hover:text-white"></i>
                    </button>
                    <div className="filter-group hidden md:flex">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs font-bold uppercase tracking-wider">
                            <i className="fas fa-sparkles"></i> AI Powered
                        </div>
                    </div>
                </div>

                {/* Filter Dropdown */}
                {showFilters && (
                    <div
                        ref={filterRef}
                        className="mt-4 p-6 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 max-w-2xl mx-auto"
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
                    >
                        <h3 className="text-lg font-bold text-white mb-4">Filter Experts</h3>

                        {/* Tags Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Skills & Expertise</label>
                            <div className="flex flex-wrap gap-2">
                                {availableSkills.map(skill => (
                                    <button
                                        key={skill.id}
                                        onClick={() => {
                                            if (selectedTags.includes(skill.name)) {
                                                setSelectedTags(selectedTags.filter(t => t !== skill.name))
                                            } else {
                                                setSelectedTags([...selectedTags, skill.name])
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedTags.includes(skill.name)
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                            }`}
                                    >
                                        {skill.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rating Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Rating</label>
                            <div className="flex gap-2">
                                {[0, 1, 2, 3, 4, 5].map(rating => (
                                    <button
                                        key={rating}
                                        onClick={() => setMinRating(rating)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${minRating === rating
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                            }`}
                                    >
                                        {rating === 0 ? 'Any' : `${rating}+ ⭐`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear All */}
                        <button
                            onClick={() => {
                                setSelectedTags([])
                                setMinRating(0)
                            }}
                            className="w-full mt-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-all"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </header>

            {/* Featured Section (Spotlight) */}
            {!searchTerm && experts.length > 0 && (
                <section className="featured-section">
                    <div className="section-header reveal">
                        <div>
                            <h2 className="section-title font-display">Top Voices</h2>
                            <p className="section-sub">Highly rated mentors creating impact this month.</p>
                        </div>
                    </div>

                    <div className="featured-grid">
                        {experts.slice(0, 2).map((expert, index) => (
                            <ExpertCardGlass
                                key={`spotlight-${expert.id}`}
                                expert={expert}
                                variant="spotlight"
                                className="reveal"
                                style={{ transitionDelay: `${index * 0.1}s` }}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Expert Directory Grid */}
            <section className="directory-section">
                <div className="section-header reveal">
                    <h2 className="section-title font-display">
                        {searchTerm ? 'Search Results' : 'Expert Directory'}
                    </h2>
                    {experts.length > 0 && (
                        <p className="section-sub">
                            {(() => {
                                const filtered = experts.filter(expert => {
                                    if (selectedTags.length > 0) {
                                        const expertTags = expert.skills || []
                                        const hasTag = selectedTags.some(tag =>
                                            expertTags.some((skill: any) => skill.name?.toLowerCase().includes(tag.toLowerCase()))
                                        )
                                        if (!hasTag) return false
                                    }
                                    if (minRating > 0) {
                                        const rating = expert.average_rating || 0
                                        if (rating < minRating) return false
                                    }
                                    return true
                                })
                                return `Showing ${filtered.length} of ${experts.length} experts`
                            })()}
                        </p>
                    )}
                </div>

                <div className="expert-grid reveal">
                    {loading ? (
                        <div className="col-span-full text-center py-20">
                            <i className="fas fa-spinner fa-spin text-4xl text-yellow-500 mb-4"></i>
                            <p className="text-gray-400">Finding the best experts for you...</p>
                        </div>
                    ) : (
                        (() => {
                            const filteredExperts = experts.filter(expert => {
                                if (selectedTags.length > 0) {
                                    const expertTags = expert.skills || []
                                    const hasTag = selectedTags.some(tag =>
                                        expertTags.some((skill: any) => skill.name?.toLowerCase().includes(tag.toLowerCase()))
                                    )
                                    if (!hasTag) return false
                                }
                                if (minRating > 0) {
                                    const rating = expert.average_rating || 0
                                    if (rating < minRating) return false
                                }
                                return true
                            })

                            if (filteredExperts.length === 0) {
                                return (
                                    <div className="col-span-full text-center py-20">
                                        <i className="fas fa-search text-4xl text-gray-600 mb-4"></i>
                                        <p className="text-gray-400 text-lg">No experts match your filters</p>
                                        <button
                                            onClick={() => {
                                                setSelectedTags([])
                                                setMinRating(0)
                                            }}
                                            className="mt-4 px-6 py-2 bg-yellow-500 text-black rounded-full font-bold hover:bg-yellow-400"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                )
                            }

                            return filteredExperts.map((expert) => (
                                <ExpertCardGlass key={expert.id} expert={expert} variant="grid" />
                            ))
                        })()
                    )}
                </div>
            </section>
        </div>
    )
}

export default function ExpertsPage() {
    return (
        <Suspense fallback={<div className="bg-black text-white h-screen flex items-center justify-center">Loading...</div>}>
            <ExpertsContent />
        </Suspense>
    )
}
