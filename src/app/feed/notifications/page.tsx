"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Bell, User, Clock, Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Notification {
    id: string;
    type: 'message' | 'like' | 'comment' | 'follow';
    sender_id: string;
    content: string;
    created_at: string;
    created_at_date: Date;
    read: boolean;
    sender: {
        name: string;
        username: string;
        avatar_url: string;
    };
    post_context?: string | null;
    is_accepted?: boolean | null;
    post_id?: string | null;
    sender_user_id?: string | null;
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [followBackState, setFollowBackState] = useState<Record<string, 'idle'|'loading'|'done'>>({});

    // Modal state for first-time trip creation
    const [showTripModal, setShowTripModal] = useState(false);
    const [selectedJoinRequest, setSelectedJoinRequest] = useState<Notification | null>(null);
    const [tripForm, setTripForm] = useState({
        trip_name: '',
        start_date: '',
        start_time: '',
        group_name: ''
    });
    const [creatingTrip, setCreatingTrip] = useState(false);

    useEffect(() => {
        const fetchNotifications = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace("/auth"); return; }
            setCurrentUser(user);

            try {
                // Fetch system messages (Trip Requests and Invites) - they have no room_id attached
                const { data: messages } = await supabase
                    .from("messages")
                    .select("*")
                    .eq("receiver_id", user.id)
                    .is("room_id", null);

                // Fetch current user's posts
                const { data: myPosts } = await supabase
                    .from("posts")
                    .select("id, content")
                    .eq("user_id", user.id);
                
                let likes: any[] = [];
                let comments: any[] = [];

                if (myPosts && myPosts.length > 0) {
                    const myPostIds = myPosts.map(p => p.id);
                    
                    const [likesResponse, commentsResponse] = await Promise.all([
                        supabase.from("likes").select("*").in("post_id", myPostIds).neq("user_id", user.id),
                        supabase.from("comments").select("*").in("post_id", myPostIds).neq("user_id", user.id)
                    ]);
                    
                    if (likesResponse.data) likes = likesResponse.data;
                    if (commentsResponse.data) comments = commentsResponse.data;
                }

                // Combine and extract unique sender IDs
                const allSenders = new Set([
                    ...(messages || []).map(m => m.sender_id),
                    ...likes.map(l => l.user_id),
                    ...comments.map(c => c.user_id)
                ].filter(Boolean));

                let profilesMap: Record<string, any> = {};
                if (allSenders.size > 0) {
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("id, name, username, avatar_url")
                        .in("id", Array.from(allSenders));

                    if (profiles) {
                        profilesMap = profiles.reduce((acc: any, p: any) => {
                            acc[p.id] = p;
                            return acc;
                        }, {});
                    }
                }

                // Format into unified Notification array
                let unified: Notification[] = [];
                
                (messages || []).forEach(m => {
                    unified.push({
                        id: `msg_${m.id}`,
                        type: m.type === 'follow' ? 'follow' : 'message',
                        sender_id: m.sender_id,
                        sender_user_id: m.sender_id,
                        content: m.content,
                        created_at_date: new Date(m.created_at),
                        created_at: new Date(m.created_at).toLocaleString(),
                        read: m.read || false,
                        sender: profilesMap[m.sender_id] || { name: "Unknown", username: "unknown", avatar_url: "" },
                        post_context: null,
                        is_accepted: m.is_accepted ?? null,
                        post_id: m.post_id
                    });
                });

                likes.forEach(l => {
                    const relatedPost = myPosts?.find(p => p.id === l.post_id);
                    unified.push({
                        id: `like_${l.id}`,
                        type: 'like',
                        sender_id: l.user_id,
                        content: "liked your post",
                        created_at_date: new Date(l.created_at),
                        created_at: new Date(l.created_at).toLocaleString(),
                        read: l.read || false,
                        sender: profilesMap[l.user_id] || { name: "Unknown", username: "unknown", avatar_url: "" },
                        post_context: relatedPost?.content || "a post"
                    });
                });

                comments.forEach(c => {
                    const relatedPost = myPosts?.find(p => p.id === c.post_id);
                    unified.push({
                        id: `comment_${c.id}`,
                        type: 'comment',
                        sender_id: c.user_id,
                        content: `"${c.content}"`,
                        created_at_date: new Date(c.created_at),
                        created_at: new Date(c.created_at).toLocaleString(),
                        read: c.read || false,
                        sender: profilesMap[c.user_id] || { name: "Unknown", username: "unknown", avatar_url: "" },
                        post_context: relatedPost?.content || "a post"
                    });
                });

                // Sort unified array by date descending
                unified.sort((a, b) => b.created_at_date.getTime() - a.created_at_date.getTime());
                setNotifications(unified);

                // Pre-check follow status for follow notifications
                const followNotifs = unified.filter(n => n.type === 'follow' && n.sender_user_id);
                if (followNotifs.length > 0) {
                    const senderIds = followNotifs.map(n => n.sender_user_id);
                    const { data: followedUsers } = await supabase.from('follows')
                        .select('following_id')
                        .eq('follower_id', user.id)
                        .in('following_id', senderIds);
                    
                    if (followedUsers) {
                        const followedSet = new Set(followedUsers.map(f => f.following_id));
                        const newState: Record<string, 'idle'|'loading'|'done'> = {};
                        followNotifs.forEach(n => {
                            if (followedSet.has(n.sender_user_id!)) {
                                newState[n.id] = 'done';
                            }
                        });
                        setFollowBackState(prev => ({ ...prev, ...newState }));
                    }
                }

                // Auto-mark all as read
                if (unified.some(n => !n.read)) {
                    handleMarkAllRead();
                }

            } catch (err) {
                console.error("Error fetching notifications:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [router]);

    const handleMarkAllRead = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const promises = [
            supabase.from("messages").update({ read: true }).eq("receiver_id", user.id).eq("read", false).is("room_id", null)
        ];

        const { data: myPosts } = await supabase.from("posts").select("id").eq("user_id", user.id);
        if (myPosts && myPosts.length > 0) {
            const myPostIds = myPosts.map(p => p.id);
            promises.push(supabase.from("likes").update({ read: true }).in("post_id", myPostIds).eq("read", false));
            promises.push(supabase.from("comments").update({ read: true }).in("post_id", myPostIds).eq("read", false));
        }

        await Promise.all(promises);
        
        setNotifications(prev => prev.map(n => ({ ...n, read: true }) ));
    };

    const handleFollowBack = async (notif: Notification) => {
        if (!currentUser || !notif.sender_user_id) return;
        setFollowBackState(s => ({ ...s, [notif.id]: 'loading' }));
        const supabase = createClient();
        // Check if already following
        const { data: existing } = await supabase.from('follows')
            .select('id').eq('follower_id', currentUser.id).eq('following_id', notif.sender_user_id).maybeSingle();
        if (existing) {
            // Unfollow
            await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', notif.sender_user_id);
            setFollowBackState(s => ({ ...s, [notif.id]: 'idle' }));
        } else {
            // Follow back
            await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: notif.sender_user_id });
            setFollowBackState(s => ({ ...s, [notif.id]: 'done' }));
        }
    };

    const handleTripRequest = async (notifId: string, status: boolean) => {
        const supabase = createClient();
        const messageId = notifId.replace('msg_', '');
        const notif = notifications.find(n => n.id === notifId);
        if (!notif || !notif.post_id || !currentUser) return;
        
        try {
            // If accepted, handle Group/Trip creation or straightforward Invite
            if (status) {
                // Check if a group room exists for this post (means trip exists)
                const { data: room } = await supabase
                    .from("chat_rooms")
                    .select("id")
                    .eq("post_id", notif.post_id)
                    .eq("type", "group")
                    .maybeSingle();

                if (room) {
                    // Update the original request message to accepted
                    const { error } = await supabase
                        .from("messages")
                        .update({ is_accepted: true })
                        .eq("id", messageId);

                    if (error) throw error;
                    
                    setNotifications(prev => prev.map(n => 
                        n.id === notifId ? { ...n, is_accepted: true } : n
                    ));
                    
                    // Trip already exists, just send the invitation
                    await sendTripInvite(notif.sender_id, notif.post_id, room.id);
                } else {
                    // Trip doesn't exist, popup the modal to build the trip
                    // Do NOT mark as accepted yet. We will mark it as accepted when the form submits.
                    setSelectedJoinRequest(notif);
                    setShowTripModal(true);
                }
            } else {
                // Declined
                const { error } = await supabase
                    .from("messages")
                    .update({ is_accepted: false })
                    .eq("id", messageId);

                if (error) throw error;
                
                alert("You declined that request");
                
                setNotifications(prev => prev.map(n => 
                    n.id === notifId ? { ...n, is_accepted: false } : n
                ));
            }
        } catch (err) {
            console.error("Error updating trip request:", err);
            alert("Failed to update trip request. Please try again.");
        }
    };

    const sendTripInvite = async (receiverId: string, postId: string, roomId: string) => {
        const supabase = createClient();
        const inviteContent = `___INVITE___|${roomId}`;
        const { error } = await supabase.from("messages").insert({
            sender_id: currentUser.id,
            receiver_id: receiverId,
            post_id: postId,
            content: inviteContent
        });
        if (error) {
            console.error("Failed to send invite", error);
        } else {
            alert("Group invitation sent to the user!");
        }
    };

    const handleCreateTripSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedJoinRequest || !selectedJoinRequest.post_id || !currentUser) return;
        setCreatingTrip(true);
        const supabase = createClient();
        const messageId = selectedJoinRequest.id.replace('msg_', '');
        
        try {
            // 0. Update the original request message as accepted
            const { error: acceptError } = await supabase
                .from("messages")
                .update({ is_accepted: true })
                .eq("id", messageId);
                
            if (acceptError) throw acceptError;

            // 1. Create Room
            const { data: newRoom, error: roomError } = await supabase
                .from("chat_rooms")
                .insert({
                    type: "group",
                    post_id: selectedJoinRequest.post_id,
                    name: tripForm.group_name
                })
                .select("id")
                .single();
            
            if (roomError || !newRoom) throw roomError || new Error("Failed to create chat room");
            
            // 2. Add owner to members
            await supabase.from("chat_members").insert({
                room_id: newRoom.id,
                user_id: currentUser.id
            });
            
            // 3. Create trip record
            await supabase.from("trips").insert({
                post_id: selectedJoinRequest.post_id,
                chat_room_id: newRoom.id,
                owner_id: currentUser.id,
                status: 'active',
                trip_name: tripForm.trip_name,
                start_date: tripForm.start_date,
                start_time: tripForm.start_time
            });

            // 4. Send the invitation to the joiner
            await sendTripInvite(selectedJoinRequest.sender_id, selectedJoinRequest.post_id, newRoom.id);
            
            // Mark the notification as accepted in the UI
            setNotifications(prev => prev.map(n => 
                n.id === selectedJoinRequest.id ? { ...n, is_accepted: true } : n
            ));
            
            setShowTripModal(false);
            setTripForm({ trip_name: '', start_date: '', start_time: '', group_name: '' });
            setSelectedJoinRequest(null);

        } catch (err) {
            console.error(err);
            alert("Error creating trip.");
        } finally {
            setCreatingTrip(false);
        }
    };

    const handleAcceptInvite = async (notifId: string, roomIdStr: string) => {
        const supabase = createClient();
        const messageId = notifId.replace('msg_', '');
        if (!currentUser) return;

        try {
            // 1. Mark invite accepted
            await supabase.from("messages").update({ is_accepted: true }).eq("id", messageId);
            // 2. Join the chat room
            await supabase.from("chat_members").insert({
                room_id: roomIdStr,
                user_id: currentUser.id
            });
            alert("You have successfully joined the trip schedule and group chat!");
            setNotifications(prev => prev.map(n => 
                n.id === notifId ? { ...n, is_accepted: true } : n
            ));
        } catch (err) {
            console.error("Error accepting invite:", err);
            alert("Failed to join trip group");
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 lg:px-8 pt-8 pb-20">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-lg tracking-[0.3em] mb-1">Notifications</h1>
                    <p className="text-gray-600 text-xs">Stay updated on trip requests and activity</p>
                </div>
                <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
                >
                    Mark all read
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">
                    <div className="w-4 h-4 rounded-full bg-gold/40 animate-pulse mx-auto mb-2" />
                    <span className="text-xs text-gray-700 uppercase tracking-widest">Loading...</span>
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-24 border border-white/[0.04] bg-white/[0.01]">
                    <div className="w-16 h-16 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                        <Bell size={24} className="text-gold/40" />
                    </div>
                    <p className="text-gray-300 text-sm font-medium mb-2">No notifications yet</p>
                    <p className="text-gray-600 text-xs max-w-xs mx-auto">
                        Activity like trip requests, likes, and comments will show up here.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map(n => (
                        <div key={n.id} className={`p-4 border rounded-sm ${n.read ? 'border-white/[0.04] bg-white/[0.02]' : 'border-gold/30 bg-gold/5'} flex gap-4 transition-colors`}>
                            <Link href={`/feed/user/${n.sender_id}`} className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black flex items-center justify-center hover:opacity-80 transition-opacity">
                                {n.sender.avatar_url ? (
                                    <Image src={n.sender.avatar_url} alt={n.sender.name} width={40} height={40} className="object-cover w-full h-full" />
                                ) : (
                                    <User size={16} className="text-gray-500" />
                                )}
                            </Link>
                            <div className="flex-1">
                                <div className="flex items-start justify-between">
                                    <div className="text-sm font-medium text-white mb-1">
                                        <Link href={`/feed/user/${n.sender_id}`} className="hover:underline">
                                            {n.sender.name} <span className="text-xs text-gold/80 font-normal ml-1">@{n.sender.username}</span>
                                        </Link>
                                        {n.type === 'follow' && <span className="font-normal text-gray-400"> started following you.</span>}
                                        {n.type === 'like' && <span className="font-normal text-gray-400"> liked your post.</span>}
                                        {n.type === 'comment' && <span className="font-normal text-gray-400"> commented on your post.</span>}
                                        {n.type === 'message' && !n.content.startsWith('___INVITE___') && <span className="font-normal text-gray-400"> wants to join your trip!</span>}
                                        {n.type === 'message' && n.content.startsWith('___INVITE___') && <span className="font-normal text-gray-400"> invited you to join a trip group!</span>}
                                    </div>

                                    <span className="flex items-center gap-1 text-[10px] text-gray-600 tracking-widest uppercase">
                                        <Clock size={10} /> {n.created_at.split(',')[0]}
                                    </span>
                                </div>
                                
                                {n.type === 'follow' && (
                                    <div className="mt-3">
                                        <button 
                                            onClick={() => handleFollowBack(n)}
                                            disabled={followBackState[n.id] === 'loading'}
                                            className={`text-[10px] px-4 py-2 font-bold uppercase tracking-[0.2em] rounded-sm transition-colors cursor-pointer ${
                                                followBackState[n.id] === 'done' 
                                                ? 'bg-white/10 text-white border border-white/20' 
                                                : 'bg-gold text-black hover:bg-gold/90'
                                            }`}
                                        >
                                            {followBackState[n.id] === 'loading' ? 'WAIT...' : (followBackState[n.id] === 'done' ? 'FOLLOWING' : 'FOLLOW BACK')}
                                        </button>
                                    </div>
                                )}

                                {n.type === 'message' && !n.content.startsWith('___INVITE___') && (
                                    <>
                                        <p className="text-sm text-gray-300 bg-white/[0.03] p-3 rounded-sm border-l-2 border-gold mt-2 leading-relaxed">
                                            "{n.content}"
                                        </p>
                                        {n.is_accepted === null ? (
                                            <div className="mt-4 flex gap-3">
                                                <button 
                                                    onClick={() => handleTripRequest(n.id, true)}
                                                    className="text-[10px] px-4 py-2 bg-gold text-black font-bold uppercase tracking-[0.2em] rounded-sm hover:bg-gold/90 transition-colors cursor-pointer"
                                                >
                                                    Accept
                                                </button>
                                                <button 
                                                    onClick={() => handleTripRequest(n.id, false)}
                                                    className="text-[10px] px-4 py-2 border border-white/10 text-gray-400 font-bold uppercase tracking-[0.2em] rounded-sm hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-4 flex items-center gap-2">
                                                <span className={`text-[10px] px-3 py-1 font-bold uppercase tracking-widest rounded-sm ${n.is_accepted ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                    {n.is_accepted ? 'Accepted' : 'Declined'}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}

                                {n.type === 'message' && n.content.startsWith('___INVITE___') && (
                                    <>
                                        {n.is_accepted === null ? (
                                            <div className="mt-4 flex gap-3">
                                                <button 
                                                    onClick={() => handleAcceptInvite(n.id, n.content.split('|')[1])}
                                                    className="text-[10px] px-4 py-2 bg-gold text-black font-bold uppercase tracking-[0.2em] rounded-sm hover:bg-gold/90 transition-colors cursor-pointer"
                                                >
                                                    Join Trip Group
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-4 flex items-center gap-2">
                                                <span className="text-[10px] px-3 py-1 font-bold uppercase tracking-widest rounded-sm bg-gold/20 text-gold border border-gold/30">
                                                    Joined
                                                </span>
                                                <button
                                                    onClick={() => router.push(`/feed/messages`)}
                                                    className="text-[10px] uppercase font-bold text-gray-400 hover:text-gold tracking-widest px-2"
                                                >
                                                    Open Chat
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {n.type === 'comment' && (
                                    <div className="mt-2 text-sm text-gray-300">
                                        <div className="flex gap-2 bg-white/[0.03] p-3 rounded-sm border-l-2 border-blue-500 mb-2">
                                            <MessageCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                            <p className="leading-relaxed">{n.content}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 italic truncate max-w-sm">
                                            On post: "{n.post_context}"
                                        </p>
                                    </div>
                                )}

                                {n.type === 'like' && (
                                    <div className="mt-2 text-sm text-gray-300">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Heart size={14} className="text-red-500 fill-red-500" />    
                                        </div>
                                        <p className="text-xs text-gray-500 italic truncate max-w-sm">
                                            On post: "{n.post_context}"
                                        </p>
                                    </div>
                                )}

                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Trip Creation Modal */}
            {showTripModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-white/10 p-6 rounded-md w-full max-w-md">
                        <h2 className="text-xl font-heading text-white mb-2 tracking-wide">Build Trip Details</h2>
                        <p className="text-xs text-gray-400 mb-6">
                            You accepted a request from <span className="text-gold">@{selectedJoinRequest?.sender?.username}</span>. Set up the details for this journey to automatically invite them to the group chat.
                        </p>
                        
                        <form onSubmit={handleCreateTripSubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Trip Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:border-gold/50 outline-none"
                                    value={tripForm.trip_name}
                                    placeholder="e.g. Himalayas Expedition"
                                    onChange={(e) => setTripForm({...tripForm, trip_name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Start Date</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:border-gold/50 outline-none"
                                        value={tripForm.start_date}
                                        onChange={(e) => setTripForm({...tripForm, start_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Start Time</label>
                                    <input 
                                        type="time" 
                                        required 
                                        className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:border-gold/50 outline-none"
                                        value={tripForm.start_time}
                                        onChange={(e) => setTripForm({...tripForm, start_time: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Group Name (Chat)</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm text-white focus:border-gold/50 outline-none"
                                    value={tripForm.group_name}
                                    placeholder="e.g. Mountain Explorers"
                                    onChange={(e) => setTripForm({...tripForm, group_name: e.target.value})}
                                />
                            </div>
                            <div className="mt-8 flex gap-3">
                                <button type="button" onClick={() => setShowTripModal(false)} className="flex-1 py-3 text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-white border border-white/10 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={creatingTrip} className="flex-1 py-3 text-xs uppercase tracking-widest font-bold text-black bg-gold hover:bg-gold/90 transition-colors disabled:opacity-50">
                                    {creatingTrip ? "Submitting..." : "Submit & Add Member"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

