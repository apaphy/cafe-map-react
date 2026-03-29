import React, { useEffect, useState } from "react";
import Image from "next/image";
import { preloadAdjacentImages, preloadAllReviewImages } from "@/app/utils/imagePreloader";

export function LocationModal({ isOpen, location, onClose })
{    
    const [ currentReview, setCurrentReview ] = useState(null)
    const [ currentImageIndex, setCurrentImageIndex ] = useState(0);
    const [ currentReviewIndex, setCurrentReviewIndex ] = useState(0);
    const [ imageLoading, setImageLoading ] = useState(true);
    
    const handleNextImage = () => {
        if (currentReview != null && currentReview["review-images"] != null) {
            setImageLoading(true);
            setCurrentImageIndex((prev) => (prev + 1) % currentReview["review-images"].length);
        }
    };
    
    const handlePrevImage = () => {
        if (currentReview != null && currentReview["review-images"] != null) {
            setImageLoading(true);
            setCurrentImageIndex((prev) => (prev - 1 + currentReview["review-images"].length) % currentReview["review-images"].length);
        }
    };

    const handleImageLoad = () => {
        setImageLoading(false);
    };

    useEffect(() =>
    {
        setCurrentReview(location?.reviews?.[currentReviewIndex] || null)
        setCurrentImageIndex(0)
        // Preload all images when review changes
        if (location?.reviews?.[currentReviewIndex]?.["review-images"]) {
            preloadAllReviewImages(location.reviews[currentReviewIndex]["review-images"]);
        }
    }, [location, currentReviewIndex]);

    // Preload adjacent images when current image changes
    useEffect(() => {
        if (currentReview?.["review-images"]) {
            preloadAdjacentImages(currentReview["review-images"], currentImageIndex, 2);
        }
    }, [currentImageIndex, currentReview])
    
    return (
        <div className="fixed top-0 right-0 z-50 transition-transform duration-300 ease-out transform m-4 gap-5">
            {/* Modal */}
            <div
                className={`bg-white shadow-2xl rounded-3xl overflow-hidden transition-transform duration-300 ease-out ${
                    isOpen ? "translate-x-0" : "translate-x-[calc(100%+40px)]"
                }`}
                style={{ maxHeight: "90vh", maxWidth: "450px", width: "100%" }}
            >
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-violet-600 to-amber-500 px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-white text-2xl font-bold">{location?.name}</h2>
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition-colors"
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
                    {/* Content */}
                    {currentReview && (
                        <div className="space-y-5">
                            {/* Image Gallery */}
                            {currentReview && currentReview["review-images"].length > 0 && (
                                <div>
                                    <div className="relative w-full aspect-square bg-gray-200 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                                        {/* Loading Skeleton */}
                                        {imageLoading && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                                        )}
                                        <Image 
                                            src={currentReview["review-images"][currentImageIndex].src} 
                                            alt="gallery"
                                            fill
                                            sizes="(max-width: 450px) 100vw"
                                            priority={true}
                                            onLoad={handleImageLoad}
                                            className={`object-cover transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                                        />
                                    </div>
                                    
                                    {/* Navigation Buttons */}
                                    {
                                        currentReview["review-images"].length > 1 &&
                                        <div className="flex justify-between items-center gap-3 mt-3">
                                            <button
                                                onClick={handlePrevImage}
                                                className="flex-1 px-3 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold text-sm transition-all active:scale-95"
                                            >
                                                ← Prev
                                            </button>
                                            <span className="text-gray-500 text-xs font-medium px-2 py-1 bg-gray-100 rounded-lg">
                                                {currentImageIndex + 1} / {currentReview["review-images"].length}
                                            </span>
                                            <button
                                                onClick={handleNextImage}
                                                className="flex-1 px-3 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold text-sm transition-all active:scale-95"
                                            >
                                                Next →
                                            </button>
                                        </div>
                                    }
                                </div>
                            )}
                            
                            {/* Date Visited */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-gray-800 text-sm font-bold uppercase tracking-wide">Date Visited</h4>
                                    <p className="text-gray-600 text-sm font-medium">{new Date(currentReview["date-of-visit"]).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}</p>
                                </div>
                            </div>

                            {/* Ratings Bars */}
                            {currentReview.ratings && Object.keys(currentReview.ratings).length > 0 && (
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4">
                                    <h3 className="text-gray-800 text-base font-bold mb-4 uppercase tracking-wide">Ratings</h3>
                                    <div className="space-y-3.5">
                                        {currentReview.ratings.map((rating) => {
                                            const numerator = rating.score
                                            const denominator = rating["rating-categories"]["max-value"]
                                            const percentage = (numerator / denominator) * 100;
                                            
                                            // Determine color based on rating percentage
                                            let barColor = 'bg-red-500';
                                            if (percentage > 66.67) {
                                                barColor = 'bg-emerald-500';
                                            } else if (percentage > 33.33) {
                                                barColor = 'bg-amber-500';
                                            }
                                            
                                            return (
                                                <div key={rating.id}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="bg-gray-200 px-2.5 py-1 rounded-xl text-gray-800 font-semibold text-sm">{rating["rating-categories"].category}</span>
                                                        <span className="bg-gray-500 px-2.5 py-1 rounded-xl text-white font-semibold text-sm">{numerator}</span>
                                                    </div>
                                                    <div className="relative h-2.5 bg-gray-300 rounded-full overflow-hidden shadow-sm">
                                                        <div
                                                            className={`h-full ${barColor} transition-all duration-500 ease-out rounded-full`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {/* Description */}
                            <div>
                                <h4 className="text-gray-800 text-sm font-bold uppercase tracking-wide mb-2">Review</h4>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{currentReview.description}</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
            {/* Review Navigation */}
            {location?.reviews && location.reviews.length > 1 && (
                <div className="px-6 pt-6">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={() => setCurrentReviewIndex((prev) => (prev - 1 + location.reviews.length) % location.reviews.length)}
                            className="flex-1 px-3 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold text-sm transition-all active:scale-95"
                        >
                            ← Previous
                        </button>
                        <span className="text-gray-500 text-xs font-medium px-3 py-2 bg-gray-100 rounded-lg">
                            {currentReviewIndex + 1} / {location.reviews.length}
                        </span>
                        <button
                            onClick={() => setCurrentReviewIndex((prev) => (prev + 1) % location.reviews.length)}
                            className="flex-1 px-3 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold text-sm transition-all active:scale-95"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}