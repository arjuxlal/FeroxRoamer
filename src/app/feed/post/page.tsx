"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { FileText, MapPin, Camera, Loader2, ArrowLeft, Plus, X, Video, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function PostPage() {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [location, setLocation] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Media State
    const [images, setImages] = useState<File[]>([]);
    const [video, setVideo] = useState<File | null>(null);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);

    const charLimit = 500;
    const maxPhotos = 4;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const remaining = maxPhotos - images.length;
        const newFiles = files.slice(0, remaining);
        
        setImages(prev => [...prev, ...newFiles]);
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setVideo(file);
        setVideoPreview(URL.createObjectURL(file));
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const removeVideo = () => {
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setVideo(null);
        setVideoPreview(null);
    };

    const uploadMedia = async (file: File, path: string): Promise<string> => {
        const supabase = createClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.replace("/auth"); return; }

            // 1. Upload Media
            const uploadedImages: string[] = [];
            let uploadedVideo: string | undefined;

            if (images.length > 0) {
                const results = await Promise.all(images.map(img => uploadMedia(img, `${user.id}/images`)));
                uploadedImages.push(...results);
            }

            if (video) {
                uploadedVideo = await uploadMedia(video, `${user.id}/videos`);
            }

            // 2. Insert Post
            const { error } = await supabase.from("posts").insert({ 
                user_id: user.id, 
                content, 
                location,
                images: uploadedImages,
                video_url: uploadedVideo
            });

            if (error) {
                console.error("Supabase insert error:", error);
                alert(`Failed to post: ${error.message}`);
                throw error;
            }

            setSuccess(true);
            setTimeout(() => router.push("/feed"), 1500);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 lg:px-8 pt-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link href="/feed" className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
                    <ArrowLeft size={14} /> Back to Feed
                </Link>
                <h1 className="font-heading text-sm tracking-[0.3em]">New Post</h1>
                <div className="w-20" />
            </div>

            {success && (
                <div className="mb-6 px-4 py-3 border border-gold/30 bg-gold/10 text-gold flex items-center gap-3 text-sm">
                    ✓ Posted! Redirecting…
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Text area */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                        <FileText size={11} /> Your Discovery
                    </label>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value.slice(0, charLimit))}
                        rows={6}
                        required
                        placeholder="Share your trail, discovery, or roaming story…"
                        className="w-full bg-white/5 border border-white/10 focus:border-gold/40 px-6 py-4 outline-none transition-colors text-sm resize-none"
                    />
                    <p className={`text-right text-xs ${content.length > charLimit * 0.9 ? "text-red-400" : "text-gray-700"}`}>
                        {content.length}/{charLimit}
                    </p>
                </div>

                {/* Location */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                        <MapPin size={11} /> Location <span className="text-gray-700 normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="Ladakh, India"
                        className="w-full bg-white/5 border border-white/10 focus:border-gold/40 px-6 py-4 outline-none transition-colors text-sm"
                    />
                </div>

                {/* Photo & Video Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Photos */}
                    <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <Camera size={11} /> Photos <span className="text-gray-700 normal-case tracking-normal">(Up to {maxPhotos})</span>
                        </label>
                        
                        <div className="grid grid-cols-2 gap-2">
                            {imagePreviews.map((url, i) => (
                                <div key={i} className="aspect-square relative rounded-sm overflow-hidden border border-white/10 group">
                                    <Image src={url} alt="Preview" fill className="object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute top-1 right-1 bg-black/60 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} className="text-white" />
                                    </button>
                                </div>
                            ))}
                            {images.length < maxPhotos && (
                                <label className="aspect-square border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gold/60 hover:border-gold/30 hover:bg-gold/5 cursor-pointer transition-all rounded-sm">
                                    <Plus size={20} />
                                    <span className="text-[10px] uppercase tracking-wider">Add Photo</span>
                                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Video */}
                    <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-2">
                            <Video size={11} /> Video <span className="text-gray-700 normal-case tracking-normal">(Limit 1)</span>
                        </label>
                        
                        {videoPreview ? (
                            <div className="aspect-video relative rounded-sm overflow-hidden border border-white/10 group bg-black">
                                <video src={videoPreview} className="w-full h-full object-contain" controls />
                                <button 
                                    type="button"
                                    onClick={removeVideo}
                                    className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <X size={14} className="text-white" />
                                </button>
                            </div>
                        ) : (
                            <label className="aspect-video border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gold/60 hover:border-gold/30 hover:bg-gold/5 cursor-pointer transition-all rounded-sm">
                                <Video size={24} />
                                <span className="text-[10px] uppercase tracking-wider">Upload Video</span>
                                <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                            </label>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !content.trim()}
                    className="w-full btn-gold text-black py-5 text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Posting…</> : <><Plus size={16} /> Share with Roamers</>}
                </button>
            </form>
        </div>
    );
}
