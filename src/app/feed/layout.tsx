import { ReactNode } from "react";
import FeedSidebar from "@/components/FeedSidebar";

export default function FeedLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-obsidian text-white flex">
            <FeedSidebar />
            {/* Main content — offset for sidebar */}
            <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
                {children}
            </main>
        </div>
    );
}
