"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
    User, Compass, ChevronDown
} from "lucide-react";
import { Post, PostCard } from "@/components/PostCard";

interface Profile {
    id: string;
    username: string;
    name: string;
    avatar_url: string;
}

// ---------- Main Feed Page ----------
export default function FeedPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace("/auth"); return; }

            const { data } = await supabase.from("profiles").select("id, username, name, avatar_url").eq("id", user.id).single();
            if (!data) { router.replace("/profile-setup"); return; }
            setProfile(data);
            setLoadingAuth(false);
            
            try {
                const { data: postsData, error: postsError } = await supabase
                    .from("posts")
                    .select("*")
                    .order('created_at', { ascending: false });
                
                if (postsError) throw postsError;
                
                if (postsData && postsData.length > 0) {
                    const postIds = postsData.map((p: any) => p.id);
                    const userIds = Array.from(new Set(postsData.map((p: any) => p.user_id).filter(Boolean)));
                    
                    // Fetch likes and comments in parallel
                    const [likesResponse, commentsResponse, profilesResponse] = await Promise.all([
                        supabase.from("likes").select("post_id, user_id").in("post_id", postIds),
                        supabase.from("comments").select("post_id").in("post_id", postIds),
                        userIds.length > 0 ? supabase.from("profiles").select("id, username, name, avatar_url").in("id", userIds) : null
                    ]);
                    
                    // Map profiles
                    let profilesMap: Record<string, any> = {};
                    if (profilesResponse && profilesResponse.data) {
                        profilesMap = profilesResponse.data.reduce((acc: any, p: any) => {
                            acc[p.id] = p;
                            return acc;
                        }, {});
                    }
                    
                    // Map likes
                    const likesByPost = (likesResponse.data || []).reduce((acc: any, like: any) => {
                        if (!acc[like.post_id]) acc[like.post_id] = { count: 0, users: new Set() };
                        acc[like.post_id].count += 1;
                        acc[like.post_id].users.add(like.user_id);
                        return acc;
                    }, {});

                    // Map comments
                    const commentsByPost = (commentsResponse.data || []).reduce((acc: any, comment: any) => {
                        acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
                        return acc;
                    }, {});

                    const formattedPosts: Post[] = postsData.map((p: any) => ({
                        id: p.id,
                        user_id: p.user_id,
                        username: profilesMap[p.user_id]?.username || "unknown",
                        name: profilesMap[p.user_id]?.name || "Unknown User",
                        avatar: profilesMap[p.user_id]?.avatar_url || "",
                        location: p.location || "",
                        time: new Date(p.created_at).toLocaleDateString(),
                        content: p.content || "",
                        images: p.images || (p.image_url ? [p.image_url] : []),
                        video_url: p.video_url || null,
                        likes: likesByPost[p.id]?.count || 0,
                        userHasLiked: user ? (likesByPost[p.id]?.users.has(user.id) || false) : false,
                        comments: commentsByPost[p.id] || 0,
                        verified: profilesMap[p.user_id]?.verified || false,
                    }));
                    setPosts(formattedPosts);
                } else {
                    setPosts([]);
                }
            } catch (err: any) {
                console.error("Error fetching posts:", err);
                setError(err.message || "Failed to load posts.");
            } finally {
                setLoadingPosts(false);
            }
        };
        init();
    }, [router]);

    if (loadingAuth) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Compass size={32} className="text-gold animate-spin" />
                    <p className="text-gray-600 text-xs tracking-widest uppercase">Loading</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 lg:px-8 pt-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-heading text-lg tracking-[0.3em]">Feed</h1>
                    <p className="text-gray-600 text-xs mt-1">Roamers around the world</p>
                </div>
                <button className="flex items-center gap-2 text-xs text-gray-600 hover:text-white transition-colors cursor-pointer">
                    Latest <ChevronDown size={14} />
                </button>
            </div>

            {/* Quick Post Prompt */}
            <Link href="/feed/post">
                <div className="w-full flex items-center gap-4 px-5 py-4 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-gold/20 transition-all mb-8 cursor-pointer group">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-gold/30 shrink-0 bg-white/5">
                        {profile?.avatar_url ? (
                            <Image src={profile.avatar_url} alt="You" width={36} height={36} className="object-cover w-full h-full" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User size={14} className="text-gold/60" />
                            </div>
                        )}
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-gray-400 transition-colors">
                        Share your next discovery, {profile?.name?.split(" ")[0]}…
                    </span>
                    <div className="ml-auto btn-gold text-black text-[10px] uppercase tracking-widest font-bold px-4 py-2">
                        Post
                    </div>
                </div>
            </Link>

            {/* Divider Label */}
            <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-white/[0.05]" />
                <span className="text-[10px] text-gray-700 uppercase tracking-widest">Explorer Feed</span>
                <div className="h-px flex-1 bg-white/[0.05]" />
            </div>

            {/* Posts */}
            <div>
                {loadingPosts ? (
                    <div className="text-center py-10">
                        <div className="inline-flex items-center gap-2 text-xs text-gray-700 uppercase tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-gold/40 animate-pulse" />
                            Loading routes…
                            <div className="w-2 h-2 rounded-full bg-gold/40 animate-pulse" />
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-center py-10 px-4 mt-4 border border-red-500/20 bg-red-500/5 rounded-lg">
                        <p className="text-sm text-red-500 font-medium mb-1">Could not load feed</p>
                        <p className="text-xs text-gray-500">{error}</p>
                        <p className="text-xs text-gold/70 mt-4 uppercase tracking-widest">Check Supabase 'posts' table</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-16 text-sm text-gray-500 uppercase tracking-widest border border-white/[0.04] bg-white/[0.01]">
                        No posts found.<br />
                        <span className="text-xs text-gray-600 mt-2 block">Share your first discovery.</span>
                    </div>
                ) : (
                    posts.map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            currentUserId={profile?.id}
                            onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                        />
                    ))
                )}
            </div>

            {/* Load more */}
            {!loadingPosts && posts.length > 0 && (
                <div className="text-center py-10">
                    <div className="inline-flex items-center gap-2 text-xs text-gray-700 uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-gold/40 animate-pulse" />
                        Loading more routes…
                        <div className="w-2 h-2 rounded-full bg-gold/40 animate-pulse" />
                    </div>
                </div>
            )}
        </div>
    );
}
