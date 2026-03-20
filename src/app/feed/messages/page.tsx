import { MessageCircle } from "lucide-react";

export default function MessagesEmptyState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
            <div className="w-20 h-20 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                <MessageCircle size={32} className="text-gold/50" />
            </div>
            <h2 className="text-xl font-heading tracking-widest text-white mb-2 uppercase">Your Messages</h2>
            <p className="text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">
                Select a conversation from the right to start messaging, or visit a roamer's profile to start a new chat.
            </p>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold/60 bg-gold/5 px-4 py-2 rounded-sm border border-gold/10">
                End-to-end encrypted
            </div>
        </div>
    );
}
