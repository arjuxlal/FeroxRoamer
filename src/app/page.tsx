"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Features from "@/components/Features";
import Community from "@/components/Community";
import Footer from "@/components/Footer";

const Hero = dynamic(() => import("@/components/Hero"), { ssr: false });

export default function Home() {
  return (
    <main className="relative text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <Community />
      <Footer />
    </main>
  );
}
