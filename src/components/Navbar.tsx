"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsLoggedIn(!!session);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <nav className="fixed top-0 w-full z-50 py-4 px-10 flex justify-between items-center glass-nav">
            <div className="flex items-center gap-4">
                <Image
                    src="/assets/logo.png"
                    alt="FEROX ROAMER Logo"
                    width={40}
                    height={40}
                    className="h-10 w-auto"
                />
                <div className="font-heading text-sm tracking-widest hidden sm:block font-bold">FEROX ROAMER</div>
            </div>
            <div className="hidden md:flex gap-10 text-xs uppercase tracking-widest opacity-70">
                <Link href="#about" className="hover:opacity-100 transition">About</Link>
                <Link href="#discover" className="hover:opacity-100 transition">Discover</Link>
                <Link href="#community" className="hover:opacity-100 transition">Community</Link>
            </div>
            <Link href={isLoggedIn ? "/feed" : "/auth"}>
                <button className="btn-gold text-black px-6 py-2 text-xs font-bold uppercase tracking-tighter">
                    {isLoggedIn ? "Enter Now" : "Join Now"}
                </button>
            </Link>
        </nav>
    );
}
