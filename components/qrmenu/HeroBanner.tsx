
"use client";

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { normalizeImageSrc } from '@/lib/normalize-image-src';

interface HeroBannerProps {
    bannerUrls: string[];
    mobileBannerUrls?: string[];
    overlayVisible?: boolean;
    tag?: string;
    title?: string;
    subtitle?: string;
}

export default function HeroBanner({
    bannerUrls,
    mobileBannerUrls = [],
    overlayVisible = false,
    tag,
    title,
    subtitle
}: HeroBannerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Determine total slides based on whichever list is longer
    const totalSlides = Math.max(bannerUrls.length, mobileBannerUrls.length);

    // Auto-slide effect
    useEffect(() => {
        if (totalSlides <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % totalSlides);
        }, 5000);

        return () => clearInterval(timer);
    }, [totalSlides]);

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    };

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
    };

    if (totalSlides === 0) return null;

    // Helper to get safe URLs
    const getDesktopUrl = (index: number) => normalizeImageSrc(bannerUrls[index]) ?? normalizeImageSrc(mobileBannerUrls[index]);
    const getMobileUrl = (index: number) => normalizeImageSrc(mobileBannerUrls[index]) ?? normalizeImageSrc(bannerUrls[index]);

    return (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl shadow-lg sm:aspect-auto sm:h-96 group bg-slate-100">
            {/* Slides */}
            {Array.from({ length: totalSlides }).map((_, index) => {
                const desktopUrl = getDesktopUrl(index);
                const mobileUrl = getMobileUrl(index);

                return (
                <div
                    key={index}
                    className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0 z-0'
                        } ${index === currentIndex ? 'z-10' : ''}`}
                >
                    {/* Desktop Image (Hidden on mobile) */}
                    <div className="hidden sm:block absolute inset-0">
                        {desktopUrl && (
                            <Image
                                src={desktopUrl}
                                alt={`Banner ${index + 1}`}
                                fill
                                className="object-cover"
                                priority={index === 0}
                                unoptimized
                            />
                        )}
                    </div>
                    {/* Mobile Image (Visible on mobile only) */}
                    <div className="block sm:hidden absolute inset-0">
                        {mobileUrl && (
                            <Image
                                src={mobileUrl}
                                alt={`Banner ${index + 1}`}
                                fill
                                className="object-cover"
                                priority={index === 0}
                                unoptimized
                            />
                        )}
                    </div>

                    {/* Gradient Overlay */}
                    {overlayVisible && (
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/40 to-transparent" />
                    )}
                </div>
                );
            })}

            {/* Content Overlay */}
            {overlayVisible && (
                <div className="absolute bottom-6 start-6 z-20 max-w-xs text-white">
                    {tag && (
                        <span className="inline-block rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                            {tag}
                        </span>
                    )}
                    {(title || subtitle) && (
                        <h2 className="mt-2 text-2xl font-black leading-tight drop-shadow-lg">
                            {title} <br />
                            <span className="text-amber-400">{subtitle}</span>
                        </h2>
                    )}
                </div>
            )}

            {/* Navigation Controls */}
            {totalSlides > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                        className="absolute start-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/20 p-1 text-white opacity-0 transition-opacity hover:bg-black/40 group-hover:opacity-100 backdrop-blur-sm"
                    >
                        <ChevronLeft className="rtl:-scale-x-100 h-5 w-5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                        className="absolute end-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/20 p-1 text-white opacity-0 transition-opacity hover:bg-black/40 group-hover:opacity-100 backdrop-blur-sm"
                    >
                        <ChevronRight className="rtl:-scale-x-100 h-5 w-5" />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-4 end-4 z-20 flex gap-1.5">
                        {Array.from({ length: totalSlides }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`h-1.5 rounded-full transition-all shadow-sm ${index === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
