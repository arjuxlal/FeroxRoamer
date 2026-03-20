"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { createClient } from "@/lib/supabase";

export default function Hero() {
    const container = useRef<HTMLDivElement>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsLoggedIn(!!session);
        };
        checkUser();
    }, []);

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1.5 } });

        tl.to("#hero-title", { opacity: 1, y: 0, delay: 0.5 })
            .to("#hero-sub", { opacity: 1, y: 0 }, "-=1")
            .to("#hero-cta", { opacity: 1, y: 0 }, "-=1");
    }, { scope: container });

    return (
        <section ref={container} className="relative h-screen flex flex-col justify-center items-center px-6 text-center overflow-hidden">
            <div className="relative z-10 pointer-events-none">
                <h1 id="hero-title" className="font-heading text-4xl md:text-7xl mb-6 opacity-0 translate-y-10 font-bold">
                    Roam <br /> <span className="text-gold">Together</span>
                </h1>
                <p id="hero-sub" className="max-w-xl text-gray-300 text-lg mb-8 opacity-0">
                    Connect with fellow explorers. Find travel companions, share hidden spots, and embark on journeys that redefine the horizon.
                </p>
                <div id="hero-cta" className="opacity-0 pointer-events-auto">
                    <Link href={isLoggedIn ? "/feed" : "/auth"} className="btn-gold text-black px-12 py-5 uppercase text-xs font-bold tracking-[0.3em] inline-block">
                        {isLoggedIn ? "Enter Now" : "Explore"}
                    </Link>
                </div>
            </div>
        </section>
    );
}
