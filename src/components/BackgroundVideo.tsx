"use client";

import { useState, useEffect } from "react";

export default function BackgroundVideo() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <>
            <video
                autoPlay
                muted
                loop
                playsInline
                className="video-bg"
            >
                <source src="/assets/hero-bg.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="overlay"></div>
        </>
    );
}
