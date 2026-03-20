"use client";

import { useState, useEffect } from "react";
import { Search as SearchIcon, User, MapPin, Check } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

interface Profile {
    id: string;
    username: string;
    name: string;
    avatar_url: string;
    bio: string;
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserAndFollowing = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                const { data: follows } = await supabase
                    .from("followers")
                    .select("following_id")
                    .eq("follower_id", user.id);
                if (follows) {
                    setFollowingIds(new Set(follows.map(f => f.following_id)));
                }
            }
        };
        fetchUserAndFollowing();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setSearched(true);

        const supabase = createClient();
        const { data } = await supabase
            .from("profiles")
            .select("id, username, name, avatar_url, bio")
            .or(`username.ilike.%${query.trim()}%,name.ilike.%${query.trim()}%`)
            .limit(20);

        setResults(data || []);
        setLoading(false);
    };

    const handleFollowToggle = async (e: React.MouseEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent navigation to profile
        
        if (!currentUserId) return;
        const supabase = createClient();
        const isFollowing = followingIds.has(targetId);

        try {
            if (isFollowing) {
                const { error } = await supabase
                    .from("followers")
                    .delete()
                    .eq("follower_id", currentUserId)
                    .eq("following_id", targetId);
                
                if (!error) {
                    const next = new Set(followingIds);
                    next.delete(targetId);
                    setFollowingIds(next);
                }
            } else {
                const { error } = await supabase
                    .from("followers")
                    .insert({ follower_id: currentUserId, following_id: targetId });
                
                if (!error) {
                    const next = new Set(followingIds);
                    next.add(targetId);
                    setFollowingIds(next);
                }
            }
        } catch (err) {
            console.error("Follow error:", err);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 lg:px-8 pt-8 pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="font-heading text-lg tracking-[0.3em] mb-1">Search</h1>
                <p className="text-gray-600 text-xs">Find roamers by name or username</p>
            </div>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="flex gap-3 mb-8">
                <div className="flex-1 relative">
                    <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search roamers…"
                        className="w-full bg-white/5 border border-white/10 focus:border-gold/40 pl-11 pr-5 py-4 outline-none transition-colors text-sm"
                    />
                </div>
                <button type="submit" className="btn-gold text-black px-6 text-xs font-bold uppercase tracking-widest">
                    Search
                </button>
            </form>

            {/* Results */}
            {loading && (
                <div className="text-center py-10 text-gray-600 text-xs tracking-widest">Searching…</div>
            )}

            {!loading && searched && results.length === 0 && (
                <div className="text-center py-16 border border-white/[0.04]">
                    <User size={24} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">No roamers found for "{query}"</p>
                </div>
            )}

            {!loading && results.map(p => (
                <div key={p.id} className="group relative">
                    <Link 
                        href={`/feed/user/${p.id}`}
                        className="flex items-center gap-4 py-4 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors px-2"
                    >
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0">
                        {p.avatar_url ? (
                            <Image src={p.avatar_url} alt={p.name} width={44} height={44} className="object-cover w-full h-full" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User size={16} className="text-gray-600" />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <p className="text-xs text-gray-600">@{p.username}</p>
                        {p.bio && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.bio}</p>}
                    </div>
                    {p.id !== currentUserId && (
                        <button 
                            onClick={(e) => handleFollowToggle(e, p.id)}
                            className={`ml-auto text-[11px] px-4 py-1.5 transition-all z-10 relative flex items-center gap-1.5 ${
                                followingIds.has(p.id)
                                ? "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                                : "border border-gold/30 text-gold hover:bg-gold/10"
                            }`}
                        >
                            {followingIds.has(p.id) ? (
                                <>
                                    <Check size={12} />
                                    Followed
                                </>
                            ) : (
                                "Follow"
                            )}
                        </button>
                    )}
                    </Link>
                </div>
            ))}

            {!searched && (
                <div className="text-center py-16">
                    <SearchIcon size={28} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">Search for fellow explorers</p>
                </div>
            )}
        </div>
    );
}
