"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Send, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface ChatMessage {
    id: string;
    room_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender?: {
        name: string;
        avatar_url: string;
    };
}

export default function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: roomId } = use(params);
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchThread = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace("/auth"); return; }
            setCurrentUser(user);

            try {
                // 1. Verify this room is direct and user is a member
                const { data: roomInfo } = await supabase
                    .from("chat_rooms")
                    .select("type")
                    .eq("id", roomId)
                    .single();
                    
                if (!roomInfo || roomInfo.type !== "private") {
                    // Not a direct chat or does not exist
                    router.push("/feed/messages");
                    return;
                }
                
                // 2. Fetch members to find the other user
                const { data: members } = await supabase
                    .from("chat_members")
                    .select("user_id")
                    .eq("room_id", roomId);
                    
                const isMember = members?.some(m => m.user_id === user.id);
                if (!isMember) {
                    router.push("/feed/messages");
                    return;
                }
                
                const otherUserId = members?.find(m => m.user_id !== user.id)?.user_id;
                
                // 3. Get other user's profile
                let currentOtherUser = null;
                if (otherUserId) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", otherUserId)
                        .single();
                    currentOtherUser = profile;
                    setOtherUser(profile);
                }

                // 4. Fetch initial chat messages
                const { data: initialMessages } = await supabase
                    .from("messages")
                    .select("*")
                    .eq("room_id", roomId)
                    .order("created_at", { ascending: true });

                if (initialMessages && members) {
                    const mappedMessages = initialMessages.map(msg => {
                        let senderProfile = null;
                        if (msg.sender_id === currentOtherUser?.id) {
                            senderProfile = currentOtherUser;
                        }
                        return { ...msg, sender: senderProfile };
                    });
                    setMessages(mappedMessages);
                }

                // 5. Mark unread messages as read
                await supabase
                    .from("messages")
                    .update({ read: true })
                    .eq("room_id", roomId)
                    .eq("receiver_id", user.id)
                    .eq("read", false);

                // 6. Setup realtime subscription
                const channel = supabase.channel(`direct_${roomId}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `room_id=eq.${roomId}`
                    }, (payload) => {
                        const newMsg = payload.new as ChatMessage;
                        setMessages(current => {
                            if (current.some(m => m.id === newMsg.id)) return current;
                            let senderProfile = null;
                            if (newMsg.sender_id === currentOtherUser?.id) {
                                senderProfile = currentOtherUser;
                            }
                            return [...current, { ...newMsg, sender: senderProfile }];
                        });
                    })
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };

            } catch (error) {
                console.error("Error fetching message thread:", error);
            } finally {
                setLoading(false);
            }
        };

        const cleanup = fetchThread();
        return () => {
            cleanup.then(cleanupFn => {
                if (cleanupFn) cleanupFn();
            });
        };
    }, [roomId, router]);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !otherUser) return;

        const content = newMessage.trim();
        setNewMessage("");

        try {
            const tempId = crypto.randomUUID();
            // Optimistic update
            setMessages(prev => [...prev, {
                id: tempId,
                room_id: roomId,
                sender_id: currentUser.id,
                content: content,
                created_at: new Date().toISOString()
            }]);

            const { error } = await supabase.from("messages").insert({
                room_id: roomId,
                sender_id: currentUser.id,
                receiver_id: otherUser.id,
                content: content,
                read: false
            });

            if (error) {
                console.error("Error sending message:", error);
                // Remove optimistic message if failed
                setMessages(prev => prev.filter(m => m.id !== tempId));
            }
        } catch (err) {
            console.error("Unexpected error:", err);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center">
                <div className="w-6 h-6 rounded-full border-2 border-gold border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="p-4 border-b border-white/[0.05] bg-black/60 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/feed/messages")} className="md:hidden text-gray-400 hover:text-white transition-colors mr-2">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-800 border-2 border-white/5 relative">
                        {otherUser?.avatar_url ? (
                            <Image src={otherUser.avatar_url} alt="Avatar" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gold font-bold">
                                {otherUser?.name?.charAt(0) || '?'}
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-sm font-medium tracking-wide text-white leading-tight">
                            {otherUser?.name || 'Unknown User'}
                        </h2>
                        {otherUser?.username && (
                            <p className="text-[10px] text-gray-500">@{otherUser.username}</p>
                        )}
                    </div>
                </div>
                <Link href={`/feed/user/${otherUser?.id}`} className="text-[10px] text-gold/80 hover:text-gold tracking-widest uppercase transition-colors">
                    View Profile
                </Link>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <p className="text-sm text-gray-400">This is the beginning of your chat with {otherUser?.name}.</p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender_id === currentUser.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-3 items-end`}>
                                    {!isMe && (
                                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-800 border border-white/10 mb-1">
                                            {msg.sender?.avatar_url && (
                                                <Image src={msg.sender.avatar_url} alt={msg.sender.name} width={32} height={32} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    )}
                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-4 py-2.5 rounded-2xl ${isMe ? 'bg-gold text-black rounded-br-sm' : 'bg-[#1a1a1a] text-gray-100 rounded-bl-sm border border-white/5'}`}>
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

            {/* Input Bar */}
            <div className="p-4 bg-black/60 border-t border-white/[0.05] shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-white/[0.03] border border-white/10 rounded-full px-5 text-sm text-white focus:outline-none focus:border-gold/50 transition-colors"
                    />
                    <button 
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-black shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                    >
                        <Send size={16} className="-ml-0.5" />
                    </button>
                </form>
            </div>
        </>
    );
}
