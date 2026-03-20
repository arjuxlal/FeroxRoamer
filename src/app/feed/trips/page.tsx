"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Map, PlusCircle, Navigation, Users, MapPin, Calendar, ArrowRight, Trash2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Trip {
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

export default function TripsPage() {
    const router = useRouter();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchTrips = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace("/auth"); return; }
            setCurrentUser(user);

            try {
                // 1. Get all chat_rooms the user is a member of
                const { data: myMemberships } = await supabase
                    .from("chat_members")
                    .select("room_id")
                    .eq("user_id", user.id);

                if (!myMemberships || myMemberships.length === 0) {
                    setLoading(false);
                    return;
                }

                const roomIds = myMemberships.map(m => m.room_id);

                // 2. Fetch trips tied to these rooms
                const { data: tripsData } = await supabase
                    .from("trips")
                    .select("*")
                    .in("chat_room_id", roomIds)
                    .order("created_at", { ascending: false });

                if (!tripsData || tripsData.length === 0) {
                    setLoading(false);
                    return;
                }

                // 3. Fetch related posts, profiles (hosts), and all chat_members for these rooms
                const postIds = [...new Set(tripsData.map(t => t.post_id).filter(Boolean))];
                const hostIds = [...new Set(tripsData.map(t => t.owner_id).filter(Boolean))];
                const tripRoomIds = [...new Set(tripsData.map(t => t.chat_room_id).filter(Boolean))];

                const [postsData, hostsData, membersData] = await Promise.all([
                    postIds.length > 0 ? supabase.from("posts").select("id, content, location, image_url").in("id", postIds) : { data: [] },
                    hostIds.length > 0 ? supabase.from("profiles").select("id, name, username, avatar_url").in("id", hostIds) : { data: [] },
                    tripRoomIds.length > 0 ? supabase.from("chat_members").select("room_id, user_id").in("room_id", tripRoomIds) : { data: [] }
                ]);

                // Fetch profiles for all members
                let allMemberProfiles: any[] = [];
                if (membersData.data && membersData.data.length > 0) {
                    const memberUserIds = [...new Set(membersData.data.map(m => m.user_id))];
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("id, name, username, avatar_url")
                        .in("id", memberUserIds);
                    if (profiles) allMemberProfiles = profiles;
                }

                // 4. Assemble trip data
                const assembledTrips = tripsData.map(trip => {
                    const post = (postsData.data || []).find(p => p.id === trip.post_id);
                    const host = (hostsData.data || []).find(h => h.id === trip.owner_id);
                    
                    const roomMembers = (membersData.data || [])
                        .filter(m => m.room_id === trip.chat_room_id)
                        .map(m => allMemberProfiles.find(p => p.id === m.user_id))
                        .filter(Boolean);

                    return {
                        ...trip,
                        post,
                        host,
                        members: roomMembers
                    };
                });

                setTrips(assembledTrips);
            } catch (error) {
                console.error("Error fetching trips:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrips();
    }, [router]);

    const handleDeleteTrip = async (e: React.MouseEvent, tripId: string, roomId: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (!confirm("Are you sure you want to delete this trip and its group chat for everyone? This action cannot be undone.")) return;

        const supabase = createClient();
        try {
            // Delete trip (will cascade delete or set null)
            const { error: tripError } = await supabase.from("trips").delete().eq("id", tripId);
            if (tripError) throw tripError;

            // Delete chat room (cascades to members/messages)
            const { error: roomError } = await supabase.from("chat_rooms").delete().eq("id", roomId);
            if (roomError) throw roomError;

            setTrips(prev => prev.filter(t => t.id !== tripId));
            alert("Trip successfully deleted");
        } catch (error) {
            console.error("Error deleting trip:", error);
            alert("Failed to delete trip");
        }
    };

    const handleLeaveTrip = async (e: React.MouseEvent, roomId: string) => {
        e.stopPropagation();
        e.preventDefault();

        if (!confirm("Are you sure you want to leave this trip group?")) return;

        const supabase = createClient();
        try {
            const { error } = await supabase
                .from("chat_members")
                .delete()
                .eq("room_id", roomId)
                .eq("user_id", currentUser.id);

            if (error) throw error;

            setTrips(prev => prev.filter(t => t.chat_room_id !== roomId));
            alert("You have left the trip group");
        } catch (error) {
            console.error("Error leaving trip:", error);
            alert("Failed to leave trip");
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 lg:px-8 pt-8 pb-20">
            <div className="mb-8">
                <h1 className="font-heading text-lg tracking-[0.3em] mb-1">Your Trips</h1>
                <p className="text-gray-600 text-xs">Document your expeditions</p>
            </div>

            {loading ? (
                <div className="text-center py-10">
                    <div className="w-4 h-4 rounded-full bg-gold/40 animate-pulse mx-auto mb-2" />
                    <span className="text-xs text-gray-700 uppercase tracking-widest">Loading...</span>
                </div>
            ) : trips.length === 0 ? (
                <div className="text-center py-24 border border-white/[0.04]">
                    <div className="w-16 h-16 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                        <Map size={24} className="text-gold/40" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium mb-2">No trips logged yet</p>
                    <p className="text-gray-700 text-xs max-w-xs mx-auto mb-6">
                        Start documenting your roaming adventures — routes, camps, discoveries.
                    </p>
                    <div className="inline-flex items-center gap-2 text-[11px] text-gold/60 border border-gold/20 px-4 py-2">
                        <Navigation size={12} />
                        Trip Logging — Coming Soon
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {trips.map(trip => (
                        <div 
                            key={trip.id} 
                            onClick={() => router.push(`/feed/trips/${trip.id}`)}
                            className="block group p-5 border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer rounded-sm hover:border-gold/30 relative"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    {trip.post?.image_url && (
                                        <div className="hidden sm:block w-24 h-24 shrink-0 rounded-sm overflow-hidden bg-black mr-4 border border-white/5">
                                            <Image src={trip.post.image_url} alt="Trip location" width={96} height={96} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-gold/10 text-gold px-2 py-1 uppercase tracking-widest font-bold rounded-sm border border-gold/20">
                                                    {trip.status || 'Active'}
                                                </span>
                                                {trip.post?.location && (
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <MapPin size={12} className="text-gold/50" />
                                                        {trip.post.location}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2">
                                                {currentUser?.id === trip.owner_id ? (
                                                    <button 
                                                        onClick={(e) => handleDeleteTrip(e, trip.id, trip.chat_room_id)}
                                                        className="p-1.5 rounded-full hover:bg-red-500/10 text-gray-600 hover:text-red-500 transition-all"
                                                        title="Delete Trip"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => handleLeaveTrip(e, trip.chat_room_id)}
                                                        className="p-1.5 rounded-full hover:bg-gold/10 text-gray-600 hover:text-gold transition-all"
                                                        title="Leave Group"
                                                    >
                                                        <LogOut size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            {trip.start_date && (
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Calendar size={12} className="text-gold/50" />
                                                    {trip.start_date} {trip.start_time && `at ${trip.start_time}`}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-base text-gray-100 font-medium mb-1 line-clamp-1">
                                            {trip.trip_name ? trip.trip_name : trip.post?.content ? trip.post.content : 'Trip without description'}
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                                            <span className="text-gray-400 font-medium">Host:</span> {trip.host?.name || 'Unknown'} <span className="text-gray-600">@{trip.host?.username || 'user'}</span>
                                        </p>
                                        
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                                    <Users size={12} /> Members ({trip.members?.length || 0})
                                                </span>
                                                <div className="flex -space-x-2">
                                                    {trip.members?.slice(0, 5).map(member => (
                                                        <div key={member.id} title={member.name} className="w-6 h-6 rounded-full border border-black bg-gray-800 overflow-hidden">
                                                            {member.avatar_url && <Image src={member.avatar_url} alt={member.name} width={24} height={24} className="w-full h-full object-cover" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowRight size={18} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
