"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { MoveRight, MoveLeft, Terminal, AlertCircle, CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";
import gsap from "gsap";

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const imageContainerRef = useRef<HTMLDivElement>(null);
    const formContainerRef = useRef<HTMLDivElement>(null);

    // Check if Supabase is configured
    const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy") &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("dummy");

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        const checkUser = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace("/feed");
            }
        };
        checkUser();
    }, [router]);

    useEffect(() => {
        gsap.fromTo(imageContainerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.8, ease: "power2.out" }
        );
        gsap.fromTo(formContainerRef.current,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: "power3.out" }
        );
    }, [mode]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConfigured) {
            setMessage({
                text: "Supabase is not configured. Please update your .env.local with real credentials.",
                type: "error"
            });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const supabase = createClient();

            if (mode === "signup") {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                // Check if email confirmation is needed
                if (data.user && !data.session) {
                    setMessage({ text: "Congrats! Check your email to confirm your account.", type: "success" });
                } else {
                    setMessage({ text: "Congrats your successfully joinned.", type: "success" });
                    // Redirect new user to complete their profile
                    setTimeout(() => router.push("/profile-setup"), 1200);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                setMessage({ text: "user logined successfully.", type: "success" });
                // Redirect to feed
                setTimeout(() => router.push("/feed"), 1000);
            }
        } catch (error: any) {
            // Provide user-friendly error messages
            const msg = error?.message || "An unexpected error occurred.";
            if (msg.toLowerCase().includes("invalid login") || msg.toLowerCase().includes("invalid credentials")) {
                setMessage({ text: "Incorrect email or password. Please try again.", type: "error" });
            } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("user already")) {
                setMessage({ text: "This email is already registered. Please login instead.", type: "error" });
            } else if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("err_name")) {
                setMessage({ text: "Cannot connect to auth server. Check your Supabase credentials.", type: "error" });
            } else if (msg.toLowerCase().includes("password")) {
                setMessage({ text: "Password must be at least 6 characters.", type: "error" });
            } else {
                setMessage({ text: msg, type: "error" });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-obsidian flex overflow-hidden font-body text-white relative">
            {/* Back Button */}
            <Link href="/" className="absolute top-8 left-8 z-50 flex items-center gap-2 text-xs uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                <ChevronLeft size={16} />
                Back to Home
            </Link>

            {/* Notification Popup */}
            {message && (
                <div className={`fixed top-8 right-8 z-[100] p-4 flex items-center gap-3 backdrop-blur-xl border max-w-sm ${message.type === 'success' ? 'border-gold/50 bg-gold/10 text-gold' : 'border-red-500/50 bg-red-500/10 text-red-400'} shadow-2xl`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            {/* Supabase Config Warning Banner */}
            {!isConfigured && (
                <div className="fixed top-0 left-0 right-0 z-[90] bg-amber-900/80 border-b border-amber-500/40 px-6 py-2 flex items-center justify-center gap-2 text-amber-300 text-xs backdrop-blur-sm">
                    <AlertCircle size={14} />
                    <span>Demo mode — Add real Supabase credentials to <code className="bg-black/30 px-1 rounded">.env.local</code> to enable authentication.</span>
                </div>
            )}

            {/* Split Page Layout */}
            <div className={`flex w-full min-h-screen ${mode === 'signup' ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Image Section */}
                <div ref={imageContainerRef} className="hidden lg:block lg:w-1/2 relative h-screen overflow-hidden">
                    <Image
                        src={mode === 'signup' ? "/assets/travel_signup_right.png" : "/assets/travel_login_left.png"}
                        alt={mode === 'signup' ? "Mountain expedition for signup" : "Night canyon for login"}
                        fill
                        className="object-cover transition-transform duration-1000 hover:scale-105"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent" />
                    <div className="absolute bottom-12 left-12 right-12">
                        <h2 className="font-heading text-2xl mb-4 leading-tight">
                            {mode === 'signup' ? "Start Your Journey" : "Welcome Back"}
                        </h2>
                        <p className="text-gray-400 text-sm max-w-sm">
                            {mode === 'signup'
                                ? "Join a community of explorers and discover the world's most hidden gems."
                                : "Continue your exploration and connect with fellow roamers across the globe."}
                        </p>
                    </div>
                </div>

                {/* Form Section */}
                <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-obsidian z-10 ${!isConfigured ? 'pt-20' : ''}`}>
                    <div ref={formContainerRef} className="w-full max-w-md">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="w-10 h-10 bg-gold/10 border border-gold/30 flex items-center justify-center">
                                <Terminal size={20} className="text-gold" />
                            </div>
                            <span className="font-heading text-sm tracking-[0.4em] text-gold">Auth_System</span>
                        </div>

                        <h1 className="font-heading text-3xl mb-2 tracking-[0.2em]">
                            {mode === 'login' ? "Login" : "Join Now"}
                        </h1>
                        <p className="text-gray-500 text-sm mb-12">
                            {mode === 'login' ? "Please enter your credentials to continue" : "Create an account to join the FEROX Roaming community"}
                        </p>

                        <form onSubmit={handleAuth} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-gray-500">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="w-full bg-white/5 border border-white/10 px-6 py-4 outline-none focus:border-gold/50 transition-colors text-sm"
                                    placeholder="explorer@ferox.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-gray-500">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                    className="w-full bg-white/5 border border-white/10 px-6 py-4 outline-none focus:border-gold/50 transition-colors text-sm"
                                    placeholder="••••••••"
                                />
                                {mode === 'signup' && (
                                    <p className="text-[10px] text-gray-600 pl-1">Minimum 6 characters</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-gold text-black py-5 text-xs font-bold uppercase tracking-[0.3em] mt-8 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <><Loader2 size={16} className="animate-spin" /> Processing...</>
                                ) : (
                                    <>{mode === 'login' ? "Sign In" : "Register"} <MoveRight size={16} /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-gray-500 text-xs">
                                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                            </p>
                            <button
                                onClick={() => {
                                    setMessage(null);
                                    setMode(mode === 'login' ? 'signup' : 'login');
                                }}
                                className="text-gold text-xs font-bold uppercase tracking-widest hover:underline flex items-center gap-2 group"
                            >
                                {mode === 'login' ? (
                                    <>Create Account <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
                                ) : (
                                    <><MoveLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Login</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
