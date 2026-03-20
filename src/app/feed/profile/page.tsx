"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
    User, Camera, Phone, Edit3, BadgeCheck, X, Check, Loader2, Upload, LogOut
} from "lucide-react";
import { Post, PostCard } from "@/components/PostCard";

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Stats
    const [tripCount, setTripCount] = useState(0);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    // Posts
    const [posts, setPosts] = useState<Post[]>([]);

    // Edit modal
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", username: "", bio: "", mobile_number: "" });
    const [saving, setSaving] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace("/auth"); return; }
            setCurrentUserId(user.id);

            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (!data) { router.replace("/profile-setup"); return; }
            setProfile(data);

            // Fetch real counts
            const [tripsRes, followersRes, followingRes] = await Promise.all([
                supabase.from("trips").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
                supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
                supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id)
            ]);

            setTripCount(tripsRes.count || 0);
            setFollowerCount(followersRes.count || 0);
            setFollowingCount(followingRes.count || 0);

            // Fetch full posts
            const { data: postsData } = await supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
            
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
                    username: data.username || "unknown",
                    name: data.name || "Unknown User",
                    avatar: data.avatar_url || "",
                    location: p.location || "",
                    time: new Date(p.created_at).toLocaleDateString(),
                    content: p.content || "",
                    images: p.images || (p.image_url ? [p.image_url] : []),
                    video_url: p.video_url || null,
                    likes: likesByPost[p.id]?.count || 0,
                    userHasLiked: user ? (likesByPost[p.id]?.users.has(user.id) || false) : false,
                    comments: commentsByPost[p.id] || 0,
                    verified: data.verified || false,
                }));
                setPosts(formattedPosts);
            } else {
                setPosts([]);
            }

            setLoading(false);
        };
        load();
    }, [router]);

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    const openEdit = () => {
        setEditForm({
            name: profile?.name || "",
            username: profile?.username || "",
            bio: profile?.bio || "",
            mobile_number: profile?.mobile_number || ""
        });
        setAvatarFile(null);
        setAvatarPreview(null);
        setEditOpen(true);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUserId) return;
        setSaving(true);
        const supabase = createClient();

        try {
            let avatarUrl = profile?.avatar_url;

            // Upload new avatar if selected
            if (avatarFile) {
                const ext = avatarFile.name.split(".").pop();
                const path = `avatars/${currentUserId}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from("avatars")
                    .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
                    avatarUrl = urlData.publicUrl;
                }
            }

            const { data: updated, error } = await supabase
                .from("profiles")
                .update({
                    name: editForm.name,
                    username: editForm.username,
                    bio: editForm.bio,
                    mobile_number: editForm.mobile_number,
                    avatar_url: avatarUrl
                })
                .eq("id", currentUserId)
                .select()
                .single();

            if (error) throw error;
            setProfile(updated);
            setEditOpen(false);
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 size={28} className="text-gold animate-spin" /></div>;
    }

    return (
        <div className="max-w-2xl mx-auto px-4 lg:px-8 pt-10 pb-20">

            {/* === PROFILE HEADER === */}
            <div className="flex items-start gap-5 mb-6">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full border-2 border-gold/30 overflow-hidden bg-white/5 shrink-0">
                    {profile?.avatar_url ? (
                        <Image src={profile.avatar_url} alt={profile.name} width={80} height={80} className="object-cover w-full h-full" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <User size={28} className="text-gold/60" />
                        </div>
                    )}
                </div>

                {/* Name, username, bio */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-semibold text-white">{profile?.name}</h2>
                        <BadgeCheck size={16} className="text-gold fill-gold" />
                    </div>
                    <p className="text-gray-600 text-sm mb-2">@{profile?.username}</p>
                    {profile?.bio && <p className="text-gray-300 text-sm leading-relaxed mb-2">{profile.bio}</p>}
                    {profile?.mobile_number && (
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone size={11} />
                            {profile.mobile_number}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                    <button
                        onClick={openEdit}
                        className="px-4 py-2 border border-white/10 text-xs text-gray-400 hover:text-white hover:border-gold/30 transition-all flex items-center gap-2 cursor-pointer rounded-sm"
                    >
                        <Edit3 size={12} />
                        <span className="hidden sm:inline">Edit Profile</span>
                        <span className="sm:hidden">Edit</span>
                    </button>
                    <button
                        onClick={handleSignOut}
                        className="p-2 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-400/30 transition-all flex items-center justify-center cursor-pointer rounded-sm lg:hidden"
                        aria-label="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {/* === STATS === */}
            <div className="flex gap-8 py-5 border-t border-b border-white/[0.06] mb-8">
                {[
                    [tripCount, "Trips"],
                    [followerCount, "Followers"],
                    [followingCount, "Following"]
                ].map(([count, label]) => (
                    <div key={label as string}>
                        <p className="text-lg font-bold text-white">{count}</p>
                        <p className="text-xs text-gray-600 uppercase tracking-widest">{label}</p>
                    </div>
                ))}
            </div>

            {/* === POSTS FEED === */}
            {posts.length === 0 ? (
                <div className="text-center py-16 border border-white/[0.04]">
                    <Camera size={28} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">No posts yet</p>
                    <p className="text-gray-700 text-xs mt-1">Share your first discovery</p>
                </div>
            ) : (
                <div className="mt-8">
                    {posts.map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            currentUserId={currentUserId!}
                            onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                        />
                    ))}
                </div>
            )}

            {/* === EDIT PROFILE MODAL === */}
            {editOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-white/10 rounded-md w-full max-w-md max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                            <h2 className="text-sm font-heading tracking-widest uppercase">Edit Profile</h2>
                            <button onClick={() => setEditOpen(false)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            {/* Avatar Upload */}
                            <div className="flex flex-col items-center gap-3 pb-4 border-b border-white/[0.06]">
                                <div className="w-20 h-20 rounded-full overflow-hidden bg-white/5 border-2 border-white/10 relative">
                                    {(avatarPreview || profile?.avatar_url) ? (
                                        <Image src={avatarPreview || profile.avatar_url} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User size={28} className="text-gold/60" />
                                        </div>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-[10px] text-gold/80 uppercase tracking-widest hover:text-gold cursor-pointer transition-colors">
                                    <Upload size={12} /> Change Photo
                                </button>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Full Name</label>
                                <input
                                    type="text" required
                                    className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:border-gold/50 outline-none"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>

                            {/* Username */}
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Username</label>
                                <input
                                    type="text" required
                                    className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:border-gold/50 outline-none"
                                    value={editForm.username}
                                    onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                />
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Bio</label>
                                <textarea
                                    rows={3}
                                    className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:border-gold/50 outline-none resize-none"
                                    value={editForm.bio}
                                    placeholder="Tell other roamers about yourself..."
                                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Mobile</label>
                                <input
                                    type="tel"
                                    className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:border-gold/50 outline-none"
                                    value={editForm.mobile_number}
                                    onChange={e => setEditForm({ ...editForm, mobile_number: e.target.value })}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditOpen(false)} className="flex-1 py-3 text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-white border border-white/10 transition-colors rounded-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs uppercase tracking-widest font-bold text-black bg-gold hover:bg-gold/90 transition-colors disabled:opacity-50 rounded-sm flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
