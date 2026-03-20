"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import {
    Camera, User, AtSign, FileText, Phone, CheckCircle2,
    AlertCircle, Loader2, ArrowRight, X, Check
} from "lucide-react";

// ---------- types ----------
type FieldError = { username?: string; name?: string; bio?: string; mobile_number?: string; mobile_confirm?: string; avatar?: string; general?: string };

// ---------- helpers ----------
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const MOBILE_RE = /^[+]?[0-9]{10,15}$/;

export default function ProfileSetupPage() {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);

    const [userId, setUserId] = useState<string | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [username, setUsername] = useState("");
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [mobile, setMobile] = useState("");
    const [mobileConfirm, setMobileConfirm] = useState("");
    const [errors, setErrors] = useState<FieldError>({});
    const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Guard — must be logged in
    useEffect(() => {
        const check = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/auth");
            } else {
                setUserId(user.id);
                // If profile already exists, skip
                const { data } = await supabase.from("profiles").select("id").eq("id", user.id).single();
                if (data) router.replace("/");
            }
        };
        check();
    }, [router]);

    // Avatar picker
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, avatar: "Image must be under 5 MB." }));
            return;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setErrors(prev => ({ ...prev, avatar: undefined }));
    };

    // Username availability debounce
    const checkUsername = useCallback(async (val: string) => {
        if (!USERNAME_RE.test(val)) {
            setUsernameStatus("idle");
            return;
        }
        setUsernameStatus("checking");
        const supabase = createClient();
        const { data } = await supabase.from("profiles").select("username").eq("username", val).single();
        setUsernameStatus(data ? "taken" : "available");
    }, []);

    useEffect(() => {
        if (username.length < 3) { setUsernameStatus("idle"); return; }
        const t = setTimeout(() => checkUsername(username), 600);
        return () => clearTimeout(t);
    }, [username, checkUsername]);

    // Validate
    const validate = (): boolean => {
        const e: FieldError = {};
        if (!USERNAME_RE.test(username)) e.username = "3–20 chars, lowercase letters, numbers or underscores.";
        if (usernameStatus === "taken") e.username = "Username already taken.";
        if (name.trim().length < 2) e.name = "Please enter your full name.";
        if (!MOBILE_RE.test(mobile)) e.mobile_number = "Enter a valid mobile number (10–15 digits).";
        if (mobile !== mobileConfirm) e.mobile_confirm = "Mobile numbers do not match.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !userId) return;
        setLoading(true);

        try {
            const supabase = createClient();
            let avatar_url = "";

            // Upload avatar if selected
            if (avatarFile) {
                const ext = avatarFile.name.split(".").pop();
                const path = `${userId}/avatar.${ext}`;
                const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
                avatar_url = urlData.publicUrl;
            }

            // Insert profile
            const { error } = await supabase.from("profiles").insert({
                id: userId,
                username: username.trim().toLowerCase(),
                name: name.trim(),
                bio: bio.trim(),
                mobile_number: mobile.trim(),
                avatar_url,
            });

            if (error) {
                if (error.code === "23505") {
                    if (error.message.includes("username")) setErrors({ username: "Username already taken." });
                    else if (error.message.includes("mobile")) setErrors({ mobile_number: "Mobile number already registered." });
                    else setErrors({ general: error.message });
                } else {
                    throw error;
                }
                return;
            }

            setSuccess(true);
            setTimeout(() => router.replace("/feed"), 2500);
        } catch (err: any) {
            setErrors({ general: err?.message || "Something went wrong. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-obsidian text-white relative flex items-center justify-center px-4 py-16 overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gold/5 rounded-full blur-[120px]" />
            </div>

            {/* Success Overlay */}
            {success && (
                <div className="fixed inset-0 z-[200] bg-obsidian/95 flex flex-col items-center justify-center gap-6 backdrop-blur-sm">
                    <div className="w-20 h-20 rounded-full border-2 border-gold/60 bg-gold/10 flex items-center justify-center animate-pulse">
                        <CheckCircle2 size={40} className="text-gold" />
                    </div>
                    <h2 className="font-heading text-2xl tracking-[0.3em] text-gold">Profile Created!</h2>
                    <p className="text-gray-400 text-sm">Welcome to FEROX Roaming, <span className="text-white font-semibold">@{username}</span></p>
                    <p className="text-gray-600 text-xs">Redirecting you home…</p>
                </div>
            )}

            <div className="relative z-10 w-full max-w-lg">
                {/* Header */}
                <div className="mb-10 text-center">
                    <span className="inline-block text-[10px] font-heading text-gold tracking-[0.5em] mb-4">FEROX ROAMING</span>
                    <h1 className="font-heading text-3xl mb-3 tracking-[0.2em]">Setup Profile</h1>
                    <p className="text-gray-500 text-sm">Complete your identity before you explore</p>
                </div>

                {/* General Error */}
                {errors.general && (
                    <div className="mb-6 px-4 py-3 border border-red-500/30 bg-red-500/10 text-red-400 flex items-center gap-3 text-sm">
                        <AlertCircle size={16} className="shrink-0" />
                        {errors.general}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-3 mb-8">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="relative w-28 h-28 rounded-full border-2 border-dashed border-gold/30 hover:border-gold/70 transition-colors group overflow-hidden cursor-pointer"
                            aria-label="Upload avatar photo"
                        >
                            {avatarPreview ? (
                                <Image src={avatarPreview} alt="Avatar preview" fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/5 group-hover:bg-white/10 transition-colors">
                                    <Camera size={24} className="text-gold/60 group-hover:text-gold transition-colors" />
                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">Photo</span>
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-8 h-8 bg-gold rounded-full flex items-center justify-center">
                                <Camera size={14} className="text-black" />
                            </div>
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        {errors.avatar && <p className="text-red-400 text-xs">{errors.avatar}</p>}
                        <p className="text-gray-600 text-[11px]">Optional · Max 5 MB</p>
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <AtSign size={11} /> Username
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value.toLowerCase())}
                                required
                                maxLength={20}
                                placeholder="ferox_explorer"
                                className={`w-full bg-white/5 border px-6 py-4 outline-none transition-colors text-sm pr-12 ${errors.username ? 'border-red-500/60' : usernameStatus === 'available' ? 'border-gold/50' : 'border-white/10 focus:border-gold/40'}`}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {usernameStatus === "checking" && <Loader2 size={14} className="text-gray-400 animate-spin" />}
                                {usernameStatus === "available" && <Check size={14} className="text-gold" />}
                                {usernameStatus === "taken" && <X size={14} className="text-red-400" />}
                            </div>
                        </div>
                        {errors.username ? (
                            <p className="text-red-400 text-xs pl-1">{errors.username}</p>
                        ) : usernameStatus === "available" ? (
                            <p className="text-gold text-xs pl-1">Username is available ✓</p>
                        ) : usernameStatus === "taken" ? (
                            <p className="text-red-400 text-xs pl-1">Username already taken</p>
                        ) : (
                            <p className="text-gray-600 text-[11px] pl-1">3–20 chars · lowercase · letters, numbers, underscore</p>
                        )}
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <User size={11} /> Full Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            placeholder="Alex Roamer"
                            className={`w-full bg-white/5 border px-6 py-4 outline-none transition-colors text-sm ${errors.name ? 'border-red-500/60' : 'border-white/10 focus:border-gold/40'}`}
                        />
                        {errors.name && <p className="text-red-400 text-xs pl-1">{errors.name}</p>}
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <FileText size={11} /> Bio <span className="text-gray-700 normal-case tracking-normal">(optional)</span>
                        </label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            rows={3}
                            maxLength={160}
                            placeholder="Explorer of remote trails and hidden roads…"
                            className="w-full bg-white/5 border border-white/10 focus:border-gold/40 px-6 py-4 outline-none transition-colors text-sm resize-none"
                        />
                        <p className="text-gray-700 text-[11px] text-right">{bio.length}/160</p>
                    </div>

                    {/* Mobile Number */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <Phone size={11} /> Mobile Number <span className="text-red-500 text-xs">*</span>
                        </label>
                        <input
                            type="tel"
                            value={mobile}
                            onChange={e => setMobile(e.target.value)}
                            required
                            placeholder="+91 98765 43210"
                            className={`w-full bg-white/5 border px-6 py-4 outline-none transition-colors text-sm ${errors.mobile_number ? 'border-red-500/60' : 'border-white/10 focus:border-gold/40'}`}
                        />
                        {errors.mobile_number && <p className="text-red-400 text-xs pl-1">{errors.mobile_number}</p>}
                    </div>

                    {/* Confirm Mobile */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <Phone size={11} /> Confirm Mobile <span className="text-red-500 text-xs">*</span>
                        </label>
                        <input
                            type="tel"
                            value={mobileConfirm}
                            onChange={e => setMobileConfirm(e.target.value)}
                            required
                            placeholder="Re-enter mobile number"
                            className={`w-full bg-white/5 border px-6 py-4 outline-none transition-colors text-sm ${errors.mobile_confirm ? 'border-red-500/60' : mobileConfirm && mobile === mobileConfirm ? 'border-gold/50' : 'border-white/10 focus:border-gold/40'}`}
                        />
                        {errors.mobile_confirm ? (
                            <p className="text-red-400 text-xs pl-1">{errors.mobile_confirm}</p>
                        ) : mobileConfirm && mobile === mobileConfirm ? (
                            <p className="text-gold text-xs pl-1">Numbers match ✓</p>
                        ) : null}
                    </div>

                    {/* Submit */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading || usernameStatus === "taken" || usernameStatus === "checking"}
                            className="w-full btn-gold text-black py-5 text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <><Loader2 size={16} className="animate-spin" /> Saving Profile…</>
                            ) : (
                                <>Complete Setup <ArrowRight size={16} /></>
                            )}
                        </button>
                    </div>

                    <p className="text-center text-gray-600 text-[11px] pt-2">
                        Fields marked <span className="text-red-400">*</span> are required and must be unique across all users.
                    </p>
                </form>
            </div>
        </main>
    );
}
