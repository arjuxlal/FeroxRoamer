"use client";

import { useState, useEffect } from "react";

const TRAVEL_IMAGES = [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800",
    "https://images.pexels.com/photos/1659438/pexels-photo-1659438.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop",
    "https://images.pexels.com/photos/346529/pexels-photo-346529.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop",
];

const GALLERY_IMAGES = [
    "https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/15286/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/93684/pexels-photo-93684.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/2444403/pexels-photo-2444403.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/754263/pexels-photo-754263.jpeg?auto=compress&cs=tinysrgb&w=800",
];

export default function Community() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    useEffect(() => {
        if (isGalleryOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isGalleryOpen]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % TRAVEL_IMAGES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <>
            <section id="community" className="py-32 px-10 relative overflow-hidden">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20 items-center">
                <div className="space-y-8">
                    <span className="text-gold text-xs font-bold tracking-widest uppercase">Community</span>
                    <h2 className="text-4xl md:text-5xl font-heading font-bold">Beyond the <br /> Solo Path</h2>
                    <p className="text-gray-400 text-lg leading-relaxed">
                        Join a network of rugged explorers who believe that some vistas are too beautiful to be seen alone. FEROX ROAMER bridges the gap between solitude and shared discovery.
                    </p>
                    <div className="pt-6">
                        <button 
                            onClick={(e) => { e.preventDefault(); setIsGalleryOpen(true); }}
                            className="border border-white/20 px-10 py-4 uppercase text-xs tracking-[0.3em] hover:bg-white hover:text-black transition duration-500"
                        >
                            View Gallery
                        </button>
                    </div>
                </div>
                <div className="aspect-square bg-zinc-900/50 border border-white/10 rounded-3xl flex items-center justify-center relative group overflow-hidden">
                    {/* Slideshow Images */}
                    {TRAVEL_IMAGES.map((img, index) => (
                        <div 
                            key={img}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <img 
                                src={img} 
                                alt={`Travel Spot ${index + 1}`} 
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10 group-hover:scale-110 transition duration-700 pointer-events-none"></div>
                    
                    {/* Overlay Caption representing Live Feed */}
                    <div className="absolute bottom-10 left-10 right-10 z-20 pointer-events-none">
                        <span className="text-gold text-[10px] font-bold tracking-widest uppercase mb-2 block">Live Feed</span>
                        <h3 className="text-xl font-heading text-white">Explore The Unknown</h3>
                        <p className="text-gray-300 text-sm mt-2 line-clamp-2">Discover breathtaking coordinates and real-time updates from fellow rovers around the globe.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Gallery Modal */}
        {isGalleryOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-10 backdrop-blur-md transition-opacity">
                <div className="relative w-full max-w-6xl max-h-full flex flex-col pt-10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-heading text-white">Destination Gallery</h3>
                        <button 
                            onClick={() => setIsGalleryOpen(false)}
                            className="text-white hover:text-gold transition-colors p-2"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 pb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {GALLERY_IMAGES.map((src, i) => (
                                <div key={i} className="aspect-[4/3] relative rounded-xl overflow-hidden group cursor-pointer">
                                    <img src={src} alt="Travel Destination" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
