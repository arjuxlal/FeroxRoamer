"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Users, MapPin, Send, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface TripDetails {
    id: string;
    post_id: string;
    chat_room_id: string;
    owner_id: string;
    status: string;
    trip_name?: string;
    start_date?: string;
    start_time?: string;
    created_at: string;
    post?: any;
    host?: any;
    members?: any[];
}

interface ChatMessage {
    id: string;
    room_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender?: any;
}

export default function TripDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const tripId = params.id as string;
    
    const [trip, setTrip] = useState<TripDetails | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchTripDetails = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace("/auth"); return; }
            setCurrentUser(user);

            try {
                // 1. Fetch trip
                const { data: tripData } = await supabase
                    .from("trips")
                    .select("*")
                    .eq("id", tripId)
                    .single();

                if (!tripData) {
                    router.replace("/feed/trips");
                    return;
                }

                // 2. Verifiy membership
                const { data: membership } = await supabase
                    .from("chat_members")
                    .select("*")
                    .eq("room_id", tripData.chat_room_id)
                    .eq("user_id", user.id)
                    .single();

                if (!membership) {
                    // Not a member of this trip
                    router.replace("/feed/trips");
                    return;
                }

                // 3. Fetch related info
                const [postRes, hostRes, membersRes] = await Promise.all([
                    supabase.from("posts").select("*").eq("id", tripData.post_id).single(),
                    supabase.from("profiles").select("*").eq("id", tripData.owner_id).single(),
                    supabase.from("chat_members").select("user_id").eq("room_id", tripData.chat_room_id)
                ]);

                let memberProfiles: any[] = [];
                if (membersRes.data && membersRes.data.length > 0) {
                    const memberUserIds = membersRes.data.map(m => m.user_id);
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("*")
                        .in("id", memberUserIds);
                    if (profiles) memberProfiles = profiles;
                }

                setTrip({
                    ...tripData,
                    post: postRes.data,
                    host: hostRes.data,
                    members: memberProfiles
                });

                // 4. Fetch initial chat messages
                const { data: initialMessages } = await supabase
                    .from("messages")
                    .select("*")
                    .eq("room_id", tripData.chat_room_id)
                    .order("created_at", { ascending: true });

                if (initialMessages) {
                    // map profiles to messages
                    const mappedMessages = initialMessages.map(msg => ({
                        ...msg,
                        sender: memberProfiles.find(p => p.id === msg.sender_id) || { name: "User", avatar_url: "" }
                    }));
                    setMessages(mappedMessages);
                }

                // 5. Setup realtime subscription
                const channel = supabase.channel(`room_${tripData.chat_room_id}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `room_id=eq.${tripData.chat_room_id}`
                    }, (payload) => {
                        const newMsg = payload.new as ChatMessage;
                        // Avoid duplicating if we just sent it
                        setMessages(current => {
                            if (current.some(m => m.id === newMsg.id)) return current;
                            const senderProfile = memberProfiles.find(p => p.id === newMsg.sender_id) || { name: "User", avatar_url: "" };
                            return [...current, { ...newMsg, sender: senderProfile }];
                        });
                    })
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };

            } catch (error) {
                console.error("Error fetching trip details:", error);
            } finally {
                setLoading(false);
            }
        };

        const cleanup = fetchTripDetails();
        return () => {
            cleanup.then(cleanupFn => {
                if (cleanupFn) cleanupFn();
            });
        };
    }, [tripId, router]);

    // Auto scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !trip || !currentUser) return;

        const content = newMessage.trim();
        setNewMessage("");

        try {
            const { error } = await supabase.from("messages").insert({
                room_id: trip.chat_room_id,
                sender_id: currentUser.id,
                content: content,
                read: false // default for group messages
            });

            if (error) {
                console.error("Error sending message:", error);
                alert("Failed to send message");
            }
        } catch (err) {
            console.error("Unexpected error:", err);
        }
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-8 pb-20 flex justify-center items-center h-screen">
                <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-8 pb-20 text-center">
                <p className="text-gray-500">Trip not found or you don't have access.</p>
                <Link href="/feed/trips" className="text-gold uppercase tracking-widest text-xs mt-4 inline-block hover:underline">
                    Back to Trips
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-8 pb-20 flex flex-col h-[calc(100vh-80px)] md:h-screen">
            {/* Header / Trip Info */}
            <div className="shrink-0 mb-6">
                <Link href="/feed/trips" className="inline-flex items-center gap-2 text-[10px] text-gray-500 hover:text-white uppercase tracking-widest mb-6 transition-colors font-medium">
                    <ArrowLeft size={14} /> Back to Trips
                </Link>

                <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm overflow-hidden flex flex-col sm:flex-row">
                    {trip.post?.image_url && (
                        <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-black">
                            <Image src={trip.post.image_url} alt="Trip location" width={400} height={400} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] bg-gold/10 text-gold px-2 py-1 uppercase tracking-widest font-bold rounded-sm border border-gold/20">
                                {trip.status || 'Active'} Trip
                            </span>
                            {trip.post?.location && (
                                <span className="text-xs text-gray-400 flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                                    <MapPin size={12} className="text-gold/60" /> {trip.post.location}
                                </span>
                            )}
                            {trip.start_date && (
                                <span className="text-xs text-gray-400 flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                                    {trip.start_date} {trip.start_time && `at ${trip.start_time}`}
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl md:text-2xl font-medium text-white mb-2 leading-tight">
                            {trip.trip_name ? trip.trip_name : trip.post?.content ? trip.post.content : 'An expedition'}
                        </h1>
                        <p className="text-sm text-gray-500 mb-4">
                            Hosted by <span className="text-gold">{trip.host?.name || 'Unknown'}</span>
                        </p>
                        
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-1">
                                <Users size={12} /> Adventurers ({trip.members?.length || 0})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {trip.members?.map(member => (
                                    <div key={member.id} className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-full pr-3 pl-1 py-1">
                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-800">
                                            {member.avatar_url ? (
                                                <Image src={member.avatar_url} alt={member.name} width={24} height={24} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] bg-gold/20 text-gold font-bold">
                                                    {member.name?.charAt(0) || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-300 font-medium">{member.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 border border-white/[0.05] bg-[#0A0A0A] rounded-sm flex flex-col min-h-[400px] overflow-hidden">
                <div className="p-4 border-b border-white/[0.05] bg-black/40 shrink-0">
                    <h2 className="text-sm font-heading tracking-widest flex items-center gap-2">
                        <MessageCircle size={14} className="text-gold" />
                        Expedition Chat
                    </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                            <MessageCircle size={32} className="text-gold/50 mb-3" />
                            <p className="text-sm text-gray-400">No messages yet.</p>
                            <p className="text-xs text-gray-600 mt-1">Say hello to your fellow roamers!</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.sender_id === currentUser.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-3 items-end`}>
                                        {!isMe && (
                                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-800 border border-white/10 mb-1">
                                                {msg.sender?.avatar_url && (
                                                    <Image src={msg.sender.avatar_url} alt={msg.sender.name} width={32} height={32} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                        )}
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {!isMe && (
                                                <span className="text-[10px] text-gray-500 ml-1 mb-1">{msg.sender?.name}</span>
                                            )}
                                            <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-gold text-black rounded-br-sm' : 'bg-white/10 text-gray-100 rounded-bl-sm border border-white/5'}`}>
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                            </div>
                                            <span className="text-[9px] text-gray-600 mt-1 mx-1 uppercase tracking-wider">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-3 bg-black/40 border-t border-white/[0.05] shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-full px-4 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                        />
                        <button 
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-black shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors cursor-pointer"
                        >
                            <Send size={16} className="-ml-1" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
