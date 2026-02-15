"use client"
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { isTokenExpired } from '@/lib/auth'
import { getMe } from '@/services/api'

export function PublicNavbar() {
    const navbarRef = useRef<HTMLElement>(null)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('atas_token')
        if (!token) {
            setIsLoggedIn(false)
        } else if (isTokenExpired(token)) {
            try { localStorage.removeItem('atas_token') } catch {}
            setIsLoggedIn(false)
        } else {
            getMe(true).then(() => {
                setIsLoggedIn(true)
            }).catch(() => {
                try { localStorage.removeItem('atas_token') } catch {}
                setIsLoggedIn(false)
            })
        }

        const handleScroll = () => {
            if (navbarRef.current) {
                if (window.scrollY > 50) navbarRef.current.classList.add('scrolled')
                else navbarRef.current.classList.remove('scrolled')
            }
        }
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'atas_token') {
                const has = !!localStorage.getItem('atas_token')
                setIsLoggedIn(has)
            }
        }
        window.addEventListener('scroll', handleScroll)
        window.addEventListener('storage', handleStorage)
        return () => {
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('storage', handleStorage)
        }
    }, [])

    return (
        <>
            <style jsx>{`
                nav {
                    position: fixed;
                    top: 0;
                    width: 100%;
                    padding: 1.5rem 3rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    z-index: 100;
                    transition: 0.3s;
                }
                
                nav.scrolled {
                    background: rgba(5, 5, 5, 0.8);
                    backdrop-filter: blur(12px);
                    padding: 1rem 3rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
            `}</style>

            <nav ref={navbarRef}>
                <Link href="/" style={{ textDecoration: 'none', color: 'white', fontSize: '1.8rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
                    ATAS<span style={{ color: '#FFD700' }}>.</span>
                </Link>

                <div style={{ display: 'flex', gap: '2rem' }} className="hidden md:flex">
                    <Link href="/experts" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: 500, transition: '0.3s' }} className="hover:text-white">Experts</Link>
                    <Link href="/events" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: 500, transition: '0.3s' }} className="hover:text-white">Events</Link>
                    <Link href="/about" style={{ color: '#9ca3af', textDecoration: 'none', fontWeight: 500, transition: '0.3s' }} className="hover:text-white">About</Link>
                </div>

                {isLoggedIn ? (
                    <Link href="/dashboard" style={{ fontWeight: 700, color: '#FFD700', textDecoration: 'none' }}>
                        Dashboard
                    </Link>
                ) : (
                    <Link href="/login" style={{ fontWeight: 700, color: '#FFD700', textDecoration: 'none' }}>
                        Login
                    </Link>
                )}
            </nav>
        </>
    )
}
