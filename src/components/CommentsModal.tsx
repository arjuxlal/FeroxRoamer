"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Send, User } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    // Joined profile data
    profiles?: {
        name: string;
        avatar_url: string;
    } | null;
}

interface CommentsModalProps {
    postId: string;
    currentUserId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onCommentAdded: () => void;
}

export function CommentsModal({ postId, currentUserId, isOpen, onClose, onCommentAdded }: CommentsModalProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const loadComments = async () => {
            setLoading(true);
            const supabase = createClient();
            
            // Note: Since we don't have FKs strictly defined in our context we might need manual joins.
            // But let's try the standard join first. If it fails due to missing FK, we'll fetch manually.
            const { data, error } = await supabase
                .from("comments")
                .select(`
                    id, post_id, user_id, content, created_at,
                    profiles ( name, avatar_url )
                `)
                .eq("post_id", postId)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching comments:", error);
                // Fallback to manual join if standard join fails
                const { data: rawComments } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
                if (rawComments && rawComments.length > 0) {
                    const userIds = Array.from(new Set(rawComments.map(c => c.user_id)));
                    const { data: profiles } = await supabase.from("profiles").select("id, name, avatar_url").in("id", userIds);
                    const profilesMap = (profiles || []).reduce((acc: any, p) => { acc[p.id] = p; return acc; }, {});
                    
                    const merged = rawComments.map(c => ({
                        ...c,
                        profiles: profilesMap[c.user_id] ? {
                            name: profilesMap[c.user_id].name,
                            avatar_url: profilesMap[c.user_id].avatar_url
                        } : null
                    }));
                    setComments(merged);
                } else {
                    setComments([]);
                }
            } else {
                setComments(data as unknown as Comment[]);
            }
            setLoading(false);
        };

        loadComments();
    }, [isOpen, postId]);

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserId) return;

        setPosting(true);
        const supabase = createClient();
        
        try {
            const { data, error } = await supabase
                .from("comments")
                .insert({
                    post_id: postId,
                    user_id: currentUserId,
                    content: newComment.trim()
                })
                .select()
                .single();

            if (!error && data) {
                setNewComment("");
                // Fetch current user's profile to display instantly
                const { data: myProfile } = await supabase.from("profiles").select("name, avatar_url").eq("id", currentUserId).single();
                
                const addedComment: Comment = {
                    ...data,
                    profiles: myProfile || { name: "You", avatar_url: "" }
                };
                setComments(prev => [...prev, addedComment]);
                onCommentAdded();
            } else {
                console.error("Failed to post comment:", error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPosting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 rounded-sm w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <h2 className="text-white font-heading tracking-widest uppercase">Comments</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-sm hover:bg-white/5">
                        <X size={20} />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[30vh]">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-6 h-6 rounded-full bg-gold/40 animate-pulse" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500 text-sm">No comments yet. Be the first to start the conversation!</p>
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 mt-1">
                                    {comment.profiles?.avatar_url ? (
                                        <Image src={comment.profiles.avatar_url} alt={comment.profiles.name || "User"} width={32} height={32} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><User size={14} className="text-gray-500"/></div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-semibold text-white">{comment.profiles?.name || "Unknown Roamer"}</span>
                                        <span className="text-[10px] text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed bg-white/[0.02] p-3 rounded-tr-xl rounded-b-xl border border-white/[0.04] inline-block">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 shrink-0 bg-[#0a0a0a]">
                    <form onSubmit={handlePostComment} className="flex gap-2 relative">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={currentUserId ? "Add a comment..." : "Sign in to comment..."}
                            disabled={!currentUserId || posting}
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || !currentUserId || posting}
                            className="bg-gold text-black w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} className={newComment.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
