# PRD: Obsidian Peak - Cinematic Horizon

## 1. Vision & Purpose
"Obsidian Peak" is a premium, high-end web experience designed to showcase "rugged luxury." The goal is to provide a cinematic, "Apple-style" landing page that wows users with smooth animations, high-quality video backgrounds, and a sophisticated aesthetic.

## 2. Target Audience
- Luxury adventurers and outdoor enthusiasts.
- High-net-worth individuals interested in premium, rugged equipment/vehicles.
- Users who appreciate clean, modern, and cinematic digital experiences.

## 3. Technical Stack
- **Framework**: HTML5/Vanilla JavaScript (or easily adaptable to Next.js/React).
- **Styling**: Tailwind CSS for rapid, utility-first design.
- **Animations**: GSAP (GreenSock Animation Platform) for high-performance, smooth entrance and scroll animations.
- **Typography**: 
    - `Syncopate`: Used for headings to provide a wide, expensive, "automotive brand" aesthetic.
    - `Inter`: Used for body text for clean, modern readability.

## 4. Core Features

### 4.1. Cinematic Hero Section
- **Background Video**: Fixed, full-screen background video (`object-fit: cover`).
- **Dynamic Overlay**: A linear-gradient dark overlay to ensure text readability regardless of video brightness.
- **Entrance Animation**: GSAP-powered "floating" entrance for the hero title, subphrase, and CTA button.

### 4.2. Navigation
- **Glassmorphism**: A fixed top navigation bar with a blur effect (`backdrop-filter: blur(12px)`) and subtle transparency.
- **Minimalist Branding**: Wide-tracked uppercase logo type.

### 4.3. Visual Hierarchy & Branding
- **Accents**: Use of "Gold" (`#E5B37A`) as a primary accent color for key focus words and primary CTAs.
- **Dark Mode by Design**: The application uses a deep black/zinc palette (`#0A0A0B`) to enhance the cinematic feel.

### 4.4. Content Sections
- **Performance/Specs Section**: A two-column grid layout pairing high-quality copy with visual previews (interior previews, tech specs).

## 5. Design Principles
- **Premium Simplicity**: Avoid Clutter. Let the video and typography do the heavy lifting.
- **Smooth Interaction**: Every element should feel alive, using micro-animations and transitions.
- **Readability First**: Ensure high contrast even over dynamic background media.

## 6. Future Enhancements (Roadmap)
- **Specs Table**: A detailed performance specification comparison table.
- **Full-Screen Gallery**: An immersive, GSAP-scrolled image/video gallery.
- **Pre-Order Flow**: Integration with a secure checkout/lead generation system.
