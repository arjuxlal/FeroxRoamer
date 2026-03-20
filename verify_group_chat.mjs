
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const notifId = 'msg_c97714f0-50a0-4f34-8178-1befd2883c45'; // One of the recent ones
    const status = true;
    const messageId = notifId.replace('msg_', '');
    const postId = '6864ba81-8570-47f7-bfab-0ba8986dc06c';
    const senderId = '9e72349a-30e9-4fc3-906b-b7bce597296d';
    const receiverId = '376e3d1d-4ecb-4fdc-912a-bb1c12d95467'; // Owner

    console.log("Simulating Acceptance for Message:", messageId);

    // 1. Update is_accepted
    const { error: updateError } = await supabase
        .from("messages")
        .update({ is_accepted: status })
        .eq("id", messageId);

    if (updateError) {
        console.error("Update Error:", updateError);
        return;
    }

    // 2. Check if group room exists
    let { data: room } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("post_id", postId)
        .eq("type", "group")
        .maybeSingle();

    let roomId = room?.id;

    if (!roomId) {
        console.log("Creating new group room...");
        const { data: newRoom, error: roomError } = await supabase
            .from("chat_rooms")
            .insert({
                type: "group",
                post_id: postId,
                name: `Trip Group: Test Journey`
            })
            .select("id")
            .single();
        
        if (roomError) {
            console.error("Room Creation Error:", roomError);
            return;
        }
        roomId = newRoom.id;

        // Add owner
        await supabase.from("chat_members").insert({
            room_id: roomId,
            user_id: receiverId
        });
        
        // Create trip
        await supabase.from("trips").insert({
            post_id: postId,
            chat_room_id: roomId,
            owner_id: receiverId,
            status: 'active'
        });
    }

    if (roomId) {
        console.log("Adding traveler to room:", roomId);
        const { error: memberError } = await supabase.from("chat_members").insert({
            room_id: roomId,
            user_id: senderId
        });
        if (memberError) console.log("Member already exists or error (ignoring):", memberError.message);
    }

    console.log("Verification complete. Check database for Room ID:", roomId);
}

verify();
