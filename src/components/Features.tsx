"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Features() {
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.registerPlugin(ScrollTrigger);

        gsap.from(".feature-card", {
            scrollTrigger: {
                trigger: container.current,
                start: "top 80%",
            },
            y: 50,
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            ease: "power2.out",
            clearProps: "all"
        });
    }, { scope: container });

    return (
        <section id="discover" ref={container} className="min-h-screen py-32 px-10">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-24">
                    <span className="text-gold text-xs font-bold tracking-widest uppercase mb-4 block">The Experience</span>
                    <h2 className="text-4xl md:text-5xl font-heading mb-6 font-bold">Forge Paths <br /> with Friends</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        FEROX ROAMER isn't just about the destination. It's about the people you meet and the stories you write together in the wild.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="feature-card p-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-heading mb-4 font-bold text-white">Find Buddies</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Match with travelers who share your pace and passion for the unknown.</p>
                    </div>

                    <div className="feature-card p-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-heading mb-4 font-bold text-white">Pin Coordinates</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Save your favorite coordinates and let fellow rovers discover the beauty you found.</p>
                    </div>

                    <div className="feature-card p-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-gold/10 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-heading mb-4 font-bold text-white">Chat With Buddies</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Real-time chat to connect and plan your next adventures together across the globe.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
