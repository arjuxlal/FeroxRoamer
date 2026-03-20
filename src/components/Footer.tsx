"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function Footer() {
    const [isPrivacyOpen, setPrivacyOpen] = useState(false);
    const [isTermsOpen, setTermsOpen] = useState(false);

    useEffect(() => {
        if (isPrivacyOpen || isTermsOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isPrivacyOpen, isTermsOpen]);

    return (
        <>
        <footer className="py-20 px-10 border-t border-white/5 relative z-10">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-4">
                    <Image
                        src="/assets/logo.png"
                        alt="FEROX ROAMER Logo"
                        width={32}
                        height={32}
                        className="h-8 w-auto grayscale opacity-50"
                    />
                    <div className="font-heading text-xs tracking-widest opacity-50 font-bold">FEROX ROAMER</div>
                </div>
                <div className="flex gap-10 text-[10px] uppercase tracking-widest opacity-30">
                    <button onClick={() => setPrivacyOpen(true)} className="hover:opacity-100 transition-opacity">Privacy</button>
                    <button onClick={() => setTermsOpen(true)} className="hover:opacity-100 transition-opacity">Terms</button>
                    <span>© 2026 Ferox</span>
                </div>
            </div>
        </footer>

        {/* Privacy Policy Modal */}
        {isPrivacyOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-10 backdrop-blur-md transition-opacity">
                <div className="relative w-full max-w-4xl max-h-full flex flex-col bg-zinc-900/80 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
                    <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                        <h3 className="text-2xl font-heading text-white">Privacy Policy (India)</h3>
                        <button onClick={() => setPrivacyOpen(false)} className="text-white hover:text-gold transition-colors">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-4 text-gray-300 text-sm leading-relaxed space-y-6">
                        <p><strong>1. Introduction</strong><br/>Welcome to FEROX ROAMER. We respect your privacy and are committed to protecting your personal data in compliance with the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 of India.</p>
                        <p><strong>2. Information Collection</strong><br/>We collect personal information including but not limited to your name, email address, phone number, and location data when you use our platform to find travel buddies and share coordinates.</p>
                        <p><strong>3. Use of Information</strong><br/>Your data is used to match you with compatible travelers, provide location-based services, and improve the platform. We do not sell your personal data to third parties.</p>
                        <p><strong>4. Data Security</strong><br/>We implement commercially reasonable security practices complying with Indian standards to protect your sensitive personal data from unauthorized access or disclosure.</p>
                        <p><strong>5. Grievance Officer</strong><br/>In accordance with the IT Act, 2000, if you have any discrepancies or grievances regarding processing of information, you can contact our Grievance Officer at legal@feroxroaming.in.</p>
                    </div>
                </div>
            </div>
        )}

        {/* Terms and Conditions Modal */}
        {isTermsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-10 backdrop-blur-md transition-opacity">
                <div className="relative w-full max-w-4xl max-h-full flex flex-col bg-zinc-900/80 border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
                    <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                        <h3 className="text-2xl font-heading text-white">Terms of Service (India)</h3>
                        <button onClick={() => setTermsOpen(false)} className="text-white hover:text-gold transition-colors">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-4 text-gray-300 text-sm leading-relaxed space-y-6">
                        <p><strong>1. Acceptance of Terms</strong><br/>By accessing or using FEROX ROAMER, you agree to be bound by these Terms. If you disagree with any part, you may not access the service.</p>
                        <p><strong>2. User Conduct</strong><br/>You agree to use this platform in compliance with all extant laws of India, including the Information Technology Act, 2000. Publishing defamatory, obscene, or unlawful material is strictly prohibited.</p>
                        <p><strong>3. Intermediary Status</strong><br/>FEROX ROAMER operates as an "Intermediary" under Section 79 of the Information Technology Act, 2000. We do not actively monitor user-generated content but will take down unlawful content upon receiving actual knowledge/court order.</p>
                        <p><strong>4. Assumption of Risk</strong><br/>Traveling involves inherent risks. FEROX ROAMER merely facilitates connections. You assume all risks associated with meeting and traveling with individuals connected through the platform.</p>
                        <p><strong>5. Governing Law & Jurisdiction</strong><br/>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in New Delhi, India.</p>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
