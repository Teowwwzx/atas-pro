"use client";

import { useState, useEffect } from 'react';

/**
 * Wireframe Mode Toggle Component
 * 
 * Use this component to easily toggle wireframe mode on/off
 * for taking screenshots for your FYP report
 * 
 * Usage:
 * 1. Import this component in your layout or page
 * 2. Click the toggle button to enable/disable wireframe mode
 * 3. Take screenshots while in wireframe mode
 */
export default function WireframeToggle() {
    const [wireframeMode, setWireframeMode] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [countdown, setCountdown] = useState(3);

    // Auto-hide after 3 seconds when wireframe mode is enabled
    useEffect(() => {
        if (wireframeMode) {
            setIsVisible(true);
            setCountdown(3);

            // Countdown timer
            const countdownInterval = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);

            // Hide after 3 seconds
            const hideTimer = setTimeout(() => {
                setIsVisible(false);
            }, 3000);

            return () => {
                clearInterval(countdownInterval);
                clearTimeout(hideTimer);
            };
        } else {
            setIsVisible(true); // Always show when wireframe is off
        }
    }, [wireframeMode]);

    useEffect(() => {
        // Check localStorage for saved preference
        const saved = localStorage.getItem('wireframe-mode');
        if (saved === 'true') {
            setWireframeMode(true);
            document.documentElement.classList.add('wireframe-mode');
        }

        // Import wireframe CSS dynamically
        if (wireframeMode) {
            // Inject CSS directly into the page
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/styles/wireframe.css';
            link.id = 'wireframe-css';
            if (!document.getElementById('wireframe-css')) {
                document.head.appendChild(link);
            }
        } else {
            // Remove CSS when disabled
            const existing = document.getElementById('wireframe-css');
            if (existing) {
                existing.remove();
            }
        }
    }, [wireframeMode]);

    const toggleWireframe = () => {
        const newMode = !wireframeMode;
        setWireframeMode(newMode);

        // Update localStorage
        localStorage.setItem('wireframe-mode', newMode.toString());

        // Toggle class on root element
        if (newMode) {
            document.documentElement.classList.add('wireframe-mode');
        } else {
            document.documentElement.classList.remove('wireframe-mode');
        }
    };

    // Don't render button if not visible
    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            background: wireframeMode ? '#000' : '#fff',
            color: wireframeMode ? '#fff' : '#000',
            padding: '10px 15px',
            borderRadius: '8px',
            border: '2px solid #000',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
            <button
                onClick={toggleWireframe}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                }}
            >
                {wireframeMode ? '🎨 EXIT WIREFRAME' : '📐 WIREFRAME MODE'}
            </button>
            {wireframeMode && countdown > 0 && (
                <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.8 }}>
                    Hiding in {countdown}s...
                </div>
            )}
        </div>
    );
}
