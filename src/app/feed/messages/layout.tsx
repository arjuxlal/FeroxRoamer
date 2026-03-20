"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface DirectRoom {
    id: string;
    created_at: string;
    other_user?: {
        id: string;
        name: string;
        avatar_url: string;
    };
    last_message?: {
        content: string;
        created_at: string;
    };
    unread_count?: number;
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [rooms, setRooms] = useState<DirectRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchDirectRooms = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/auth");
                return;
            }
            setCurrentUser(user);

            try {
                // 1. Get ALL direct rooms the user is in
                // First get room IDs from chat_members
                const { data: myMemberships } = await supabase
                    .from("chat_members")
                    .select("room_id")
                    .eq("user_id", user.id);

                if (!myMemberships || myMemberships.length === 0) {
                    setRooms([]);
                    setLoading(false);
                    return;
                }

                const roomIds = myMemberships.map(m => m.room_id);

                // 2. Fetch those rooms but only `type === 'direct'`
                const { data: directRoomsData } = await supabase
                    .from("chat_rooms")
                    .select("*")
                    .eq("type", "private")
                    .in("id", roomIds);

                if (!directRoomsData || directRoomsData.length === 0) {
                    setRooms([]);
                    setLoading(false);
                    return;
                }

                const directRoomIds = directRoomsData.map(r => r.id);

                // 3. For each direct room, get the OTHER member's profile and the latest message
                // Fetch all members of these rooms
                const { data: allMembers } = await supabase
                    .from("chat_members")
                    .select("room_id, user_id")
                    .in("room_id", directRoomIds)
                    .neq("user_id", user.id); 

                const otherUserIds = allMembers?.map(m => m.user_id) || [];
                
                // Fetch profiles
                let profilesMap: Record<string, any> = {};
                if (otherUserIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("id, name, avatar_url")
                        .in("id", otherUserIds);
                        
                    if (profiles) {
                        profiles.forEach(p => profilesMap[p.id] = p);
                    }
                }

                const roomsWithDetails = await Promise.all(directRoomsData.map(async (room) => {
                    const latestMsgReq = await supabase
                        .from("messages")
                        .select("content, created_at")
                        .eq("room_id", room.id)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    const otherMember = allMembers?.find(m => m.room_id === room.id);
                    const profile = otherMember ? profilesMap[otherMember.user_id] : null;

                    const unreadCountReq = await supabase
                        .from("messages")
                        .select('id', { count: 'exact', head: true })
                        .eq("room_id", room.id)
                        .eq("receiver_id", user.id)
                        .eq("read", false);

                    return {
                        id: room.id,
                        created_at: room.created_at,
                        other_user: profile,
                        last_message: latestMsgReq.data || undefined,
                        unread_count: unreadCountReq.count || 0
                    };
                }));

                // Sort by latest message
                roomsWithDetails.sort((a, b) => {
                    const dateA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
                    const dateB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
                    return dateB - dateA;
                });

                setRooms(roomsWithDetails);

            } catch (err) {
                console.error("Error fetching direct messages:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDirectRooms();
    }, [pathname, router]);

    // Calculate if we're on mobile and looking at a specific chat
    const isSpecificChat = pathname !== "/feed/messages";

    return (
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 h-[calc(100vh-80px)] md:h-screen">
            <div className="flex bg-[#0A0A0A] border border-white/[0.05] rounded-sm h-full overflow-hidden">
                
                {/* LEFT SIDE: Messaging Area (Children) */}
                {/* On mobile, hidden if not in a specific chat */}
                <div className={`flex-1 flex flex-col h-full bg-black/40 ${isSpecificChat ? 'flex' : 'hidden md:flex'}`}>
                    {children}
                </div>

                {/* RIGHT SIDE: Conversations List */}
                {/* On mobile, hidden if we ARE in a specific chat */}
                <div className={`w-full md:w-80 border-l border-white/[0.05] flex flex-col bg-[#0d0d0d] ${isSpecificChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-5 border-b border-white/[0.05] shrink-0">
                        <h2 className="font-heading text-sm uppercase tracking-widest flex items-center gap-2">
                            <MessageCircle size={14} className="text-gold" />
                            Conversations
                        </h2>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <div className="w-5 h-5 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="text-center p-6 opacity-50">
                                <p className="text-xs text-gray-400">No conversations yet.</p>
                                <p className="text-[10px] text-gray-500 mt-1">Visit a profile to send a message.</p>
                            </div>
                        ) : (
                            rooms.map((room) => {
                                const isActive = pathname === `/feed/messages/${room.id}`;
                                return (
                                    <Link 
                                        key={room.id}
                                        href={`/feed/messages/${room.id}`}
                                        className={`flex items-center gap-3 p-3 rounded-sm transition-colors ${isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 shrink-0 border border-white/5 relative">
                                            {room.other_user?.avatar_url ? (
                                                <Image src={room.other_user.avatar_url} alt="Avatar" fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gold font-bold">
                                                    {room.other_user?.name?.charAt(0) || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <p className={`text-xs ${room.unread_count && room.unread_count > 0 ? 'font-bold text-white' : 'font-medium text-gray-300'} truncate pr-2`}>
                                                    {room.other_user?.name || 'Unknown User'}
                                                </p>
                                                {room.unread_count ? (
                                                    <span className="w-4 h-4 rounded-full bg-gold text-black flex items-center justify-center text-[9px] font-bold shrink-0">
                                                        {room.unread_count}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className={`text-[10px] truncate ${room.unread_count && room.unread_count > 0 ? 'text-white/90 font-medium' : 'text-gray-500'}`}>
                                                {room.last_message ? room.last_message.content : 'No messages yet'}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
