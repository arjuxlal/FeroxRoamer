"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
    User, Heart, MessageCircle, Share2, MapPin,
    MoreHorizontal, BadgeCheck, Trash2, Flag
} from "lucide-react";
import { CommentsModal } from "@/components/CommentsModal";

export interface Post {
    id: string;
    user_id: string;
    username: string;
    name: string;
    avatar: string;
    location: string;
    time: string;
    content: string;
    images: string[];
    video_url: string | null;
    likes: number;
    userHasLiked: boolean;
    comments: number;
    verified: boolean;
}

export function PostCard({ post, currentUserId, onDelete }: { post: Post, currentUserId?: string, onDelete?: (id: string) => void }) {
    const [liked, setLiked] = useState(post.userHasLiked);
    const [likeCount, setLikeCount] = useState(post.likes);
    const [commentCount, setCommentCount] = useState(post.comments);
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [deleted, setDeleted] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isOwner = post.user_id === currentUserId;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/feed?post=${post.id}`;
        const shareData = {
            title: 'FEROX Roaming - Check out this discovery!',
            text: `Check out this discovery by ${post.name} in ${post.location}!`,
            url: shareUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error("Error sharing:", err);
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                alert("Link copied to clipboard!");
            } catch (err) {
                console.error("Failed to copy:", err);
            }
        }
    };

    const handleLike = async () => {
        if (!currentUserId || isLiking) return;
        setIsLiking(true);
        const supabase = createClient();
        
        try {
            if (liked) {
                // Unlike
                const { error } = await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
                if (!error) {
                    setLiked(false);
                    setLikeCount(c => c - 1);
                }
            } else {
                // Like
                const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });
                if (!error) {
                    setLiked(true);
                    setLikeCount(c => c + 1);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLiking(false);
        }
    };

    const handleJoin = async () => {
        if (!currentUserId || joined) return;
        setJoining(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.from('messages').insert({
                sender_id: currentUserId,
                receiver_id: post.user_id,
                post_id: post.id,
                content: `I am ready to join with you on your trip to ${post.location || 'this location'}!`,
            });
            
            if (error) {
                console.error("Error sending join message:", error);
                alert("Could not send join request. Please try again.");
            } else {
                setJoined(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setJoining(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        setMenuOpen(false);
        const supabase = createClient();
        const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', currentUserId!);
        if (error) {
            console.error("Delete error:", error);
            alert("Failed to delete post.");
        } else {
            setDeleted(true);
            if (onDelete) onDelete(post.id);
        }
    };

    const handleReport = async () => {
        if (!currentUserId) return;
        setMenuOpen(false);
        const supabase = createClient();
        const { error } = await supabase.from('post_reports').insert({
            post_id: post.id,
            reporter_id: currentUserId,
            reason: 'Reported by user'
        });

        if (error) {
            if (error.code === '23505') {
                // Unique constraint violation — already reported
                alert("You have already reported this post.");
            } else {
                console.error("Report error:", error);
                alert("Failed to submit report. Please try again.");
            }
        } else {
            alert("Post reported. If it receives enough reports it will be removed automatically.");
        }
    };

    if (deleted) return null;

    return (
        <article className="border-b border-white/[0.06] pb-6 mb-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Link href={`/feed/user/${post.user_id}`} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-gold/50 transition-colors">
                        {post.avatar ? (
                            <Image src={post.avatar} alt={post.name} width={40} height={40} className="object-cover w-full h-full" />
                        ) : (
                            <User size={16} className="text-gray-500" />
                        )}
                    </Link>
                    <div>
                        <Link href={`/feed/user/${post.user_id}`} className="flex items-center gap-1.5 group cursor-pointer">
                            <span className="text-sm font-semibold text-white group-hover:text-gold transition-colors">{post.name}</span>
                            {post.verified && <BadgeCheck size={14} className="text-gold fill-gold" />}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                            <span>@{post.username}</span>
                            <span>·</span>
                            <span>{post.time}</span>
                            {post.location && (
                                <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1 text-gold/70">
                                        <MapPin size={10} />
                                        {post.location}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="relative" ref={menuRef}>
                    <button
                        className="text-gray-700 hover:text-gray-300 transition-colors p-2 cursor-pointer"
                        aria-label="More options"
                        onClick={() => setMenuOpen(o => !o)}
                    >
                        <MoreHorizontal size={16} />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-[#111] border border-white/10 rounded-sm shadow-xl z-50 overflow-hidden">
                            {isOwner ? (
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    onClick={handleDelete}
                                >
                                    <Trash2 size={13} />
                                    Delete Post
                                </button>
                            ) : (
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                                    onClick={handleReport}
                                >
                                    <Flag size={13} />
                                    Report Post
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <p className="text-gray-300 text-sm leading-relaxed mb-4 pl-[52px]">{post.content}</p>

            {/* Media Rendering */}
            {(post.images.length > 0 || post.video_url) && (
                <div className="pl-[52px] mb-6 space-y-3">
                    {/* Images Gallery */}
                    {post.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto snap-x no-scrollbar pb-2">
                            {post.images.map((img, i) => (
                                <div key={i} className={`snap-start shrink-0 relative rounded-sm overflow-hidden border border-white/5 bg-white/5 ${post.images.length === 1 ? "w-full aspect-video" : "w-[260px] aspect-[4/5]"}`}>
                                    <Image 
                                        src={img} 
                                        alt={`Post image ${i + 1}`} 
                                        fill 
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 600px"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Video Player */}
                    {post.video_url && (
                        <div className="rounded-sm overflow-hidden border border-white/5 bg-black aspect-video relative group">
                            <video 
                                src={post.video_url} 
                                className="w-full h-full object-contain"
                                controls
                                muted
                                playsInline
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 pl-[52px]">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${liked ? "text-red-400" : "text-gray-600 hover:text-red-400"}`}
                    aria-label="Like post"
                >
                    <Heart size={16} className={liked ? "fill-red-400" : ""} />
                    <span>{likeCount}</span>
                </button>
                <button onClick={() => setIsCommentsOpen(true)} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gold transition-colors cursor-pointer" aria-label="Comment">
                    <MessageCircle size={16} />
                    <span>{commentCount}</span>
                </button>
                <button 
                    onClick={handleShare}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gold transition-colors cursor-pointer" 
                    aria-label="Share"
                >
                    <Share2 size={16} />
                </button>
                {post.user_id !== currentUserId && (
                    <button
                        onClick={handleJoin}
                        disabled={joining || joined}
                        className={`ml-4 px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${joined ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-gold text-black hover:bg-gold/90'}`}
                    >
                        {joining ? "Joining..." : joined ? "Requested" : "Join Trip"}
                    </button>
                )}
            </div>

            <CommentsModal 
                postId={post.id} 
                currentUserId={currentUserId || null} 
                isOpen={isCommentsOpen} 
                onClose={() => setIsCommentsOpen(false)} 
                onCommentAdded={() => setCommentCount(c => c + 1)}
            />
        </article>
    );
}
