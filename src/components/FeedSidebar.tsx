"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
    Home, PlusSquare, MessageCircle, User, Map, Search, Compass, LogOut, ChevronRight, Bell
} from "lucide-react";

interface Profile {
    username: string;
    name: string;
    avatar_url: string;
}

export default function Sidebar() {
    const pathname = usePathname();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase.from("profiles").select("username, name, avatar_url").eq("id", user.id).single();
            if (data) setProfile(data);
            
            // Immediately hide indicators if on the respective pages
            if (pathname === "/feed/notifications") {
                setHasUnreadNotifications(false);
            }
            if (pathname.startsWith("/feed/messages")) {
                setHasUnreadMessages(false);
            }

            // 1. Check for unread trip join requests (messages with NO room_id)
            let unreadNotifsCount = 0;
            const { count: notifMsgCount } = await supabase
                .from("messages")
                .select("*", { count: 'exact', head: true })
                .eq("receiver_id", user.id)
                .is("room_id", null)
                .eq("read", false);
            if (notifMsgCount) unreadNotifsCount += notifMsgCount;

            // 2. Check for unread actual chat messages (messages WITH room_id)
            const { count: chatMsgCount } = await supabase
                .from("messages")
                .select("*", { count: 'exact', head: true })
                .eq("receiver_id", user.id)
                .not("room_id", "is", null)
                .eq("read", false);
            if (chatMsgCount && chatMsgCount > 0) {
                setHasUnreadMessages(true);
            }

            // 3. Check for unread likes and comments
            const { data: posts } = await supabase.from("posts").select("id").eq("user_id", user.id);
            if (posts && posts.length > 0) {
                const postIds = posts.map((p: any) => p.id);
                const { count: likesCount } = await supabase
                    .from("likes")
                    .select("*", { count: 'exact', head: true })
                    .in("post_id", postIds)
                    .neq("user_id", user.id)
                    .eq("read", false);
                if (likesCount) unreadNotifsCount += likesCount;

                const { count: commentsCount } = await supabase
                    .from("comments")
                    .select("*", { count: 'exact', head: true })
                    .in("post_id", postIds)
                    .neq("user_id", user.id)
                    .eq("read", false);
                if (commentsCount) unreadNotifsCount += commentsCount;
            }
            
            if (unreadNotifsCount > 0 && pathname !== "/feed/notifications") setHasUnreadNotifications(true);
            else setHasUnreadNotifications(false);
        };
        load();
    }, [pathname]);

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    const navLinks = [
        { href: "/feed", label: "Home", icon: Home },
        { href: "/feed/search", label: "Search", icon: Search },
        { href: "/feed/post", label: "Post", icon: PlusSquare },
        { href: "/feed/notifications", label: "Notifications", icon: Bell },
        { href: "/feed/messages", label: "Messages", icon: MessageCircle },
        { href: "/feed/trips", label: "Trips", icon: Map },
        { href: "/feed/profile", label: "Profile", icon: User },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-obsidian border-r border-white/[0.06] z-40 py-8 px-5">
                {/* Logo */}
                <Link href="/feed" className="flex items-center gap-3 mb-10 group">
                    <div className="w-9 h-9 bg-gold/10 border border-gold/30 flex items-center justify-center">
                        <Compass size={18} className="text-gold" />
                    </div>
                    <span className="font-heading text-[11px] tracking-[0.4em] text-gold">FEROX</span>
                </Link>

                {/* Nav Items */}
                <nav className="flex-1 space-y-1">
                    {navLinks.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        const isNotifications = href === "/feed/notifications";
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-4 px-4 py-3.5 text-sm transition-all duration-200 group rounded-sm ${active
                                    ? "bg-gold/10 text-gold border-l-2 border-gold"
                                    : "text-gray-400 hover:text-white hover:bg-white/[0.04] border-l-2 border-transparent"
                                    }`}
                            >
                                <div className="relative">
                                    <Icon size={18} className={active ? "text-gold" : "group-hover:text-white transition-colors"} />
                                    {((isNotifications && hasUnreadNotifications) || (href === "/feed/messages" && hasUnreadMessages)) && (
                                        <>
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse blur-[1px]"></div>
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-obsidian"></div>
                                        </>
                                    )}
                                </div>
                                <span className="font-medium tracking-wide">{label}</span>
                                {active && <ChevronRight size={14} className="ml-auto text-gold/60" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Profile Footer */}
                <div className="mt-auto pt-6 border-t border-white/[0.06]">
                    <Link href="/feed/profile" className="flex items-center gap-3 px-2 py-3 hover:bg-white/[0.04] rounded-sm transition-colors group">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-gold/30 shrink-0 bg-white/5">
                            {profile?.avatar_url ? (
                                <Image src={profile.avatar_url} alt="Profile" width={36} height={36} className="object-cover w-full h-full" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User size={16} className="text-gold/60" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">{profile?.name || "Loading…"}</p>
                            <p className="text-xs text-gray-600 truncate">@{profile?.username || "…"}</p>
                        </div>
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-600 hover:text-red-400 transition-colors mt-1"
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-obsidian/95 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-between px-1 py-1.5 safe-area-pb">
                {navLinks.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    // Profile shows avatar
                    if (href === "/feed/profile") {
                        return (
                            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-1 px-1.5 min-w-[50px]">
                                <div className={`w-6 h-6 rounded-full overflow-hidden border ${active ? "border-gold" : "border-white/20"} bg-white/5`}>
                                    {profile?.avatar_url ? (
                                        <Image src={profile.avatar_url} alt="Profile" width={24} height={24} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User size={12} className="text-gold/60" />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[7px] uppercase tracking-wider ${active ? "text-gold" : "text-gray-600"}`}>
                                    {label}
                                </span>
                            </Link>
                        );
                    }
                    return (
                        <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-1 px-1.5 min-w-[50px]">
                            {href === "/feed/post" ? (
                                <div className={`w-9 h-9 flex items-center justify-center ${active ? "bg-gold" : "bg-gold/10 border border-gold/30"} rounded-sm transition-all`}>
                                    <Icon size={16} className={active ? "text-black" : "text-gold"} />
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <Icon size={20} className={active ? "text-gold" : "text-gray-600"} />
                                        {((href === "/feed/notifications" && hasUnreadNotifications) || (href === "/feed/messages" && hasUnreadMessages)) && (
                                            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-obsidian"></div>
                                        )}
                                    </div>
                                    <span className={`text-[7px] uppercase tracking-wider ${active ? "text-gold" : "text-gray-600"}`}>
                                        {label}
                                    </span>
                                </>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
