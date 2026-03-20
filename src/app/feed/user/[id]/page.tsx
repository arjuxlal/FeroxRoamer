"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { User, MapPin, Grid, MessageCircle, Share2, Map as MapIcon, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Post, PostCard } from "@/components/PostCard";

interface Profile {
    id: string;
    username: string;
    name: string;
    bio: string | null;
    avatar_url: string | null;
}

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    
    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Auth & Follow State
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [messageLoading, setMessageLoading] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [tripCount, setTripCount] = useState(0);

    useEffect(() => {
        const loadProfile = async () => {
            const supabase = createClient();
            
            // 1. Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }

            // 2. Load profile info
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", id)
                .single();

            if (profileError || !profileData) {
                console.error("Profile not found:", profileError);
                setLoading(false);
                return;
            }
            setProfile(profileData);

            // 3. Load user's posts
            const { data: postsData } = await supabase
                .from("posts")
                .select("*")
                .eq("user_id", id)
                .order("created_at", { ascending: false });
            
            if (postsData && postsData.length > 0) {
                const postIds = postsData.map((p: any) => p.id);
                const [likesResponse, commentsResponse] = await Promise.all([
                    supabase.from("likes").select("post_id, user_id").in("post_id", postIds),
                    supabase.from("comments").select("post_id").in("post_id", postIds)
                ]);

                const likesByPost = (likesResponse.data || []).reduce((acc: any, like: any) => {
                    if (!acc[like.post_id]) acc[like.post_id] = { count: 0, users: new Set() };
                    acc[like.post_id].count += 1;
                    acc[like.post_id].users.add(like.user_id);
                    return acc;
                }, {});

                const commentsByPost = (commentsResponse.data || []).reduce((acc: any, comment: any) => {
                    acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
                    return acc;
                }, {});

                const formattedPosts: Post[] = postsData.map((p: any) => ({
                    id: p.id,
                    user_id: p.user_id,
                    username: profileData.username || "unknown",
                    name: profileData.name || "Unknown User",
                    avatar: profileData.avatar_url || "",
                    location: p.location || "",
                    time: new Date(p.created_at).toLocaleDateString(),
                    content: p.content || "",
                    images: p.images || (p.image_url ? [p.image_url] : []),
                    video_url: p.video_url || null,
                    likes: likesByPost[p.id]?.count || 0,
                    userHasLiked: user ? (likesByPost[p.id]?.users.has(user.id) || false) : false,
                    comments: commentsByPost[p.id] || 0,
                    verified: profileData.verified || false,
                }));
                setPosts(formattedPosts);
            } else {
                setPosts([]);
            }

            // 4. Check follow status and fetch counts
            const [followStatusRes, followersRes, followingRes, tripsRes] = await Promise.all([
                user && user.id !== id
                    ? supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", id).maybeSingle()
                    : Promise.resolve({ data: null }),
                supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", id),
                supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", id),
                supabase.from("trips").select("id", { count: "exact", head: true }).eq("owner_id", id)
            ]);

            if ((followStatusRes as any).data) setIsFollowing(true);
            setFollowerCount((followersRes as any).count || 0);
            setFollowingCount((followingRes as any).count || 0);
            setTripCount((tripsRes as any).count || 0);

            setLoading(false);
        };

        loadProfile();
    }, [id]);

    const handleFollowToggle = async () => {
        if (!currentUserId) return;
        setFollowLoading(true);
        const supabase = createClient();

        try {
            if (isFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from("follows")
                    .delete()
                    .eq("follower_id", currentUserId)
                    .eq("following_id", id);
                if (!error) {
                    setIsFollowing(false);
                    setFollowerCount(c => Math.max(0, c - 1));
                    // Remove follow notification
                    await supabase.from("messages").delete()
                        .eq("sender_id", currentUserId)
                        .eq("receiver_id", id)
                        .eq("type", "follow");
                }
            } else {
                // Follow
                const { error } = await supabase
                    .from("follows")
                    .insert({ follower_id: currentUserId, following_id: id });
                if (!error) {
                    setIsFollowing(true);
                    setFollowerCount(c => c + 1);
                    // Send follow notification
                    await supabase.from("messages").insert({
                        sender_id: currentUserId,
                        receiver_id: id,
                        type: "follow",
                        content: "started following you.",
                        read: false
                    });
                }
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
        } finally {
            setFollowLoading(false);
        }
    };


    const handleMessageClick = async () => {
        if (!currentUserId) return;
        setMessageLoading(true);
        const supabase = createClient();
        
        try {
            // 1. Get all rooms I'm in
            const { data: myRooms } = await supabase
                .from("chat_members")
                .select("room_id")
                .eq("user_id", currentUserId);
                
            if (myRooms && myRooms.length > 0) {
                const roomIds = myRooms.map(m => m.room_id);
                // 2. Get rooms the other user is in from my rooms
                const { data: sharedRooms } = await supabase
                    .from("chat_members")
                    .select("room_id")
                    .eq("user_id", id)
                    .in("room_id", roomIds);
                    
                if (sharedRooms && sharedRooms.length > 0) {
                    const sharedRoomIds = sharedRooms.map(m => m.room_id);
                    // 3. Find if any of these are 'direct'
                    const { data: directRoom } = await supabase
                        .from("chat_rooms")
                        .select("id")
                        .eq("type", "private")
                        .in("id", sharedRoomIds)
                        .limit(1)
                        .maybeSingle();
                        
                    if (directRoom) {
                        router.push(`/feed/messages/${directRoom.id}`);
                        return;
                    }
                }
            }
            
            // 4. No direct room exists, create one
            const { data: newRoom, error: roomError } = await supabase
                .from("chat_rooms")
                .insert({
                    type: "private"
                })
                .select("id")
                .single();
                
            if (roomError || !newRoom) throw roomError;
            
            // 5. Add both members
            await supabase.from("chat_members").insert([
                { room_id: newRoom.id, user_id: currentUserId },
                { room_id: newRoom.id, user_id: id }
            ]);
            
            router.push(`/feed/messages/${newRoom.id}`);
            
        } catch (error) {
            console.error("Error creating/navigating to message:", error);
            alert("Could not open chat. Please try again.");
            setMessageLoading(false);
        }
    };



    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 rounded-full bg-gold/40 animate-pulse mb-4" />
                <p className="text-gray-500 text-sm uppercase tracking-widest font-heading">Loading Roamer...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <User size={48} className="text-gray-800 mb-4" />
                <h1 className="text-2xl font-heading tracking-widest text-white mb-2">User Not Found</h1>
                <p className="text-gray-500 text-sm mb-6">The roamer you are looking for does not exist.</p>
                <button onClick={() => router.back()} className="text-gold hover:text-white transition-colors text-sm font-medium tracking-wide">
                    &larr; Go Back
                </button>
            </div>
        );
    }

    const isOwnProfile = currentUserId === profile.id;

    return (
        <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-6 pb-24">
            {/* Header / Nav */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-semibold uppercase tracking-widest mb-8">
                <ChevronLeft size={14} /> Back
            </button>

            {/* Profile Info */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 border-b border-white/[0.04] pb-10">
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gold/30 shrink-0 bg-white/5 flex items-center justify-center shadow-2xl relative group">
                    {profile.avatar_url ? (
                        <Image src={profile.avatar_url} alt={profile.name} fill className="object-cover" />
                    ) : (
                        <User size={40} className="text-gold/40" />
                    )}
                </div>

                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-heading text-white tracking-widest mb-1">{profile.name}</h1>
                    <p className="text-gold/80 text-sm font-medium mb-4">@{profile.username}</p>
                    
                    {profile.bio && (
                        <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-lg mx-auto md:mx-0">
                            {profile.bio}
                        </p>
                    )}

                    {/* Stats Row */}
                    <div className="flex items-center justify-center md:justify-start gap-8 mb-5">
                        {[
                            [tripCount, "Trips"],
                            [followerCount, "Followers"],
                            [followingCount, "Following"]
                        ].map(([count, label]) => (
                            <div key={label as string} className="text-center md:text-left">
                                <p className="text-lg font-bold text-white">{count}</p>
                                <p className="text-[10px] text-gray-600 uppercase tracking-widest">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Follow Action Row */}
                    {!isOwnProfile ? (
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            {isFollowing ? (
                                <>
                                    <button 
                                        onClick={handleFollowToggle}
                                        disabled={followLoading}
                                        className="px-6 py-2.5 rounded-sm border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors disabled:opacity-50"
                                    >
                                        {followLoading ? "..." : "Unfollow"}
                                    </button>
                                    <button 
                                        onClick={handleMessageClick}
                                        disabled={messageLoading}
                                        className="px-6 py-2.5 rounded-sm bg-white/10 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <MessageCircle size={14} /> {messageLoading ? "Opening..." : "Message"}
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                    className="px-8 py-2.5 rounded-sm bg-gold text-black hover:bg-gold/90 transition-colors text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(234,179,8,0.2)] disabled:opacity-50"
                                >
                                    {followLoading ? "..." : "Follow"}
                                </button>
                            )}
                        </div>
                    ) : (
                        <Link href="/feed/profile" className="inline-block px-8 py-2.5 rounded-sm border border-gold/30 text-gold hover:bg-gold/5 transition-colors text-xs font-bold uppercase tracking-widest">
                            Edit Profile
                        </Link>
                    )}
                </div>
            </div>

            {/* User's Posts Feed */}
            <div className="mt-10">
                <div className="flex items-center gap-3 mb-6">
                    <Grid size={18} className="text-gray-500" />
                    <h2 className="text-sm text-gray-400 uppercase tracking-widest font-heading">Recent Discoveries</h2>
                </div>

                {posts.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-sm">
                        <MapIcon size={32} className="text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No discoveries posted yet.</p>
                    </div>
                ) : (
                    <div className="mt-8">
                        {posts.map((post) => (
                            <PostCard 
                                key={post.id} 
                                post={post} 
                                currentUserId={currentUserId || undefined}
                                onDelete={isOwnProfile ? (id) => setPosts(prev => prev.filter(p => p.id !== id)) : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

