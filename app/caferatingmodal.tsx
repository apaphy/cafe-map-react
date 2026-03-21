import React, { useState, useRef } from "react";
import Image from "next/image";
import { useQuery } from '@tanstack/react-query';
import { fetchRatingCategories } from "@/app/supabase/cafe";
import { createSupabaseClient } from "@/app/supabase/client";

const transformImageUrl = (imageUrl, width = 400, quality = 75) => {
  if (!imageUrl) return null;
  
  // If it's a Supabase URL, add transformation params
  if (imageUrl.includes('supabase.co')) {
    const url = new URL(imageUrl);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', quality.toString());
    return url.toString();
  }
  return imageUrl;
};

export function CafeRatingModal({ isOpen, onClose, onSubmit }) {
    const [cafeName, setCafeName] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [dateVisited, setDateVisited] = useState("");
    const [overallRating, setOverallRating] = useState(1);
    const [review, setReview] = useState("");
    const [images, setImages] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const fileInputRef = useRef(null);

    // Fetch rating categories from Supabase
    const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery({
        queryKey: ['ratingCategories'],
        queryFn: fetchRatingCategories,
    });

    // Initialize ratings when categories are loaded
    const [ratings, setRatings] = useState({});
    
    React.useEffect(() => {
        if (categories.length > 0) {
            const initialRatings = categories.reduce((acc, cat) => ({ 
                ...acc, 
                [cat.category]: Math.round((cat.min + cat.max) / 2) 
            }), {});
            setRatings(initialRatings);
        }
    }, [categories]);

    const handleRatingChange = (category, value) => {
        setRatings(prev => ({ ...prev, [category]: parseInt(value) }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newImages = files.map((file: File) => ({
            file,
            preview: URL.createObjectURL(file),
            id: Date.now() + Math.random()
        }));
        setImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].preview);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newImages = [...images];
        const draggedImage = newImages[draggedIndex];
        newImages.splice(draggedIndex, 1);
        newImages.splice(dropIndex, 0, draggedImage);

        setImages(newImages);
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
            alert("Please enter valid latitude and longitude values.");
            return;
        }

        try {
            const supabase = createSupabaseClient();
            
            // Check for existing cafe within ~10 meters tolerance (approximately 0.0001 degrees)
            const tolerance = 0.0001;
            const { data: existingCafes, error: searchError } = await supabase
                .from('cafes')
                .select('id, name, lat, long')
                .gte('lat', lat - tolerance)
                .lte('lat', lat + tolerance)
                .gte('long', lng - tolerance)
                .lte('long', lng + tolerance);
            
            if (searchError) {
                console.error("Error searching for existing cafe:", searchError);
                alert("Error checking for existing cafe. Please try again.");
                return;
            }

            let cafeId;
            
            if (existingCafes && existingCafes.length > 0) {
                // Use existing cafe
                cafeId = existingCafes[0].id;
                console.log("Using existing cafe:", existingCafes[0]);
            } else {
                // Insert new cafe
                const { data: newCafe, error: insertError } = await supabase
                    .from('cafes')
                    .insert({
                        name: cafeName,
                        lat: lat,
                        long: lng
                    })
                    .select('id')
                    .single();
                
                if (insertError) {
                    console.error("Error inserting new cafe:", insertError);
                    alert("Error creating new cafe. Please try again.");
                    return;
                }
                
                cafeId = newCafe.id;
                console.log("Created new cafe with ID:", cafeId);
            }

            // Insert review row in reviews table
            const { data: newReview, error: reviewError } = await supabase
                .from('reviews')
                .insert({
                    'date-of-visit': dateVisited,
                    description: review,
                    cafe: cafeId,
                    sentiment: overallRating
                })
                .select('id')
                .single();

            if (reviewError) {
                console.error("Error inserting review:", reviewError);
                alert("Review could not be saved. Please try again.");
                return;
            }

            const reviewId = newReview.id;

            // Insert ratings rows for each category
            const ratingsPayload = categories.map(cat => ({
                review: reviewId,
                score: ratings[cat.category] ?? Math.round((cat.min + cat.max) / 2),
                category: cat.id
            }));

            const { error: ratingsInsertError } = await supabase
                .from('ratings')
                .insert(ratingsPayload);

            if (ratingsInsertError) {
                console.error("Error inserting category ratings:", ratingsInsertError);
                alert("Ratings could not be saved. Please try again.");
                console.log(ratingsPayload);
                return;
            }

            // Upload review images to storage and then insert review-images rows
            const reviewImages = [];
            if (images.length > 0) {

                for (let index = 0; index < images.length; index++) {
                    const img = images[index];
                    const extension = img.file?.name?.split('.').pop() || 'jpg';
                    const fileName = `review-${reviewId}-${Date.now()}-${index}.${extension}`;

                    const { error: uploadError } = await supabase
                        .storage
                        .from('review-images')
                        .upload(fileName, img.file, { cacheControl: '3600', upsert: false });

                    if (uploadError) {
                        console.error("Error uploading image:", uploadError);
                        alert("One or more images could not be uploaded. Please try again.");
                        return;
                    }

                    const { data: publicData } = supabase
                        .storage
                        .from('review-images')
                        .getPublicUrl(fileName);

                    if (!publicData?.publicUrl) {
                        console.error("Error getting public URL for image:", fileName);
                        alert("Cannot resolve uploaded image URL. Please try again.");
                        return;
                    }

                    reviewImages.push({
                        review: reviewId,
                        src: publicData.publicUrl
                    });
                }

                const { error: reviewImagesError } = await supabase
                    .from('review-images')
                    .insert(reviewImages);

                if (reviewImagesError) {
                    console.error("Error inserting review-images rows:", reviewImagesError);
                    alert("Review images could not be recorded. Please try again.");
                    return;
                }
            }

            // Construct the complete cafe data without additional query
            const cafeData = existingCafes && existingCafes.length > 0 ? {
                id: existingCafes[0].id,
                name: existingCafes[0].name,
                lat: existingCafes[0].lat,
                long: existingCafes[ 0 ].long,
                reviews: []
            } : {
                id: cafeId,
                name: cafeName,
                lat: lat,
                long: lng,
                revews: []
            };

            // Construct the review with ratings and images
            const completeReview = {
                ...newReview,
                'date-of-visit': dateVisited,
                description: review,
                sentiment: overallRating,
                cafe: cafeId,
                ratings: ratingsPayload.map(rating => ({
                    ...rating,
                    'rating-categories': categories.find(cat => cat.id === rating.category)
                })),
                'review-images': reviewImages.map(img => ({
                    ...img,
                    src: transformImageUrl(img.src)
                }))
            };

            // Add the review to the cafe
            cafeData.reviews = [completeReview];

            // Submit the complete cafe data for instant map update
            onSubmit(cafeData);

            // Clean up object URLs
            images.forEach(img => URL.revokeObjectURL(img.preview));
            
            // Reset form
            setCafeName("");
            setLatitude("");
            setLongitude("");
            setDateVisited("");
            setOverallRating(0);
            const resetRatings = categories.reduce((acc, cat) => ({ 
                ...acc, 
                [cat.category]: Math.round((cat.min + cat.max) / 2) 
            }), {});
            setRatings(resetRatings);
            setReview("");
            setImages([]);
            onClose();
            
        } catch (error) {
            console.error("Error in form submission:", error);
            alert("An error occurred. Please try again.");
        }
    };

    return (
        <>
            {/* Modal */}
            <div
                className={`fixed top-0 right-0 bg-white shadow-2xl z-50 transition-transform duration-300 ease-out transform m-4 rounded-3xl overflow-hidden ${
                    isOpen ? "translate-x-0" : "translate-x-[calc(100%+40px)]"
                }`}
                style={{ maxHeight: "90vh", maxWidth: "450px", width: "100%" }}
            >
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-violet-600 to-amber-500 px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-white text-2xl font-bold">rate cafe</h2>
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition-colors"
                            aria-label="Close modal"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
                    {/* Loading State */}
                    {categoriesLoading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-8 h-8 border-4 border-gray-300 border-t-amber-500 rounded-full animate-spin mb-4" />
                            <p className="text-gray-600">Loading rating categories...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {categoriesError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <p className="text-red-800 font-medium">Error loading rating categories</p>
                            <p className="text-red-600 text-sm mt-1">{categoriesError.message}</p>
                        </div>
                    )}

                    {/* Form */}
                    {!categoriesLoading && !categoriesError && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Cafe Name */}
                        <div>
                            <label className="block text-gray-800 text-sm font-bold uppercase tracking-wide mb-2">
                                Cafe Name
                            </label>
                            <input
                                type="text"
                                value={cafeName}
                                onChange={(e) => setCafeName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-black"
                                required
                            />
                        </div>

                        {/* Latitude and Longitude */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-800 text-sm font-bold uppercase tracking-wide mb-2">
                                    Latitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-black"
                                    placeholder="e.g. 34.0522"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-800 text-sm font-bold uppercase tracking-wide mb-2">
                                    Longitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-black"
                                    placeholder="e.g. -118.2437"
                                    required
                                />
                            </div>
                        </div>

                        {/* Date Visited */}
                        <div>
                            <label className="block text-gray-800 text-sm font-bold uppercase tracking-wide mb-2">
                                Date Visited
                            </label>
                            <input
                                type="date"
                                value={dateVisited}
                                onChange={(e) => setDateVisited(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-black"
                                required
                            />
                        </div>

                        {/* Overall Rating */}
                        <div>
                            <label className="block text-gray-800 text-sm font-bold uppercase tracking-wide mb-2">
                                Overall Rating
                            </label>
                            <div className="flex gap-15 justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setOverallRating(1)}
                                        className={`w-8 h-8 rounded-full transition-all border-2 ${
                                            overallRating === 1
                                                ? "bg-red-500 border-red-600 shadow-lg scale-130"
                                                : "bg-red-400 border-red-300 hover:bg-red-500 hover:scale-105"
                                        }`}
                                        aria-label="Poor rating"
                                    />
                                    <span className="text-xs text-gray-600 font-medium">bad</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setOverallRating(2)}
                                        className={`w-8 h-8 rounded-full transition-all border-2 ${
                                            overallRating === 2
                                                ? "bg-yellow-500 border-yellow-600 shadow-lg scale-130"
                                                : "bg-yellow-400 border-yellow-300 hover:bg-yellow-500 hover:scale-105"
                                        }`}
                                        aria-label="Average rating"
                                    />
                                    <span className="text-xs text-gray-600 font-medium">okay</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setOverallRating(3)}
                                        className={`w-8 h-8 rounded-full transition-all border-2 ${
                                            overallRating === 3
                                                ? "bg-green-500 border-green-600 shadow-lg scale-130"
                                                : "bg-green-400 border-green-300 hover:bg-green-500 hover:scale-105"
                                        }`}
                                        aria-label="Excellent rating"
                                    />
                                    <span className="text-xs text-gray-600 font-medium">good</span>
                                </div>
                            </div>
                        </div>

                        {/* Category Ratings */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4">
                            <h3 className="text-gray-800 text-base font-bold mb-4 uppercase tracking-wide">Detailed Ratings</h3>
                            <div className="space-y-4">
                                {categories.map((cat) => (
                                    <div key={cat.category}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="bg-gray-200 px-2.5 py-1 rounded-xl text-gray-800 font-semibold text-sm">{cat.category}</span>
                                            <span className="bg-gray-500 px-2.5 py-1 rounded-xl text-white font-semibold text-sm">{ratings[cat.category] ?? Math.round((cat.min + cat.max) / 2)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={cat.min}
                                            max={cat.max}
                                            value={ratings[cat.category] ?? Math.round((cat.min + cat.max) / 2)}
                                            onChange={(e) => handleRatingChange(cat.category, e.target.value)}
                                            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider"
                                            style={{
                                                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((ratings[cat.category] ?? Math.round((cat.min + cat.max) / 2)) - cat.min) / (cat.max - cat.min) * 100}%, #d1d5db ${((ratings[cat.category] ?? Math.round((cat.min + cat.max) / 2)) - cat.min) / (cat.max - cat.min) * 100}%, #d1d5db 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>{cat.min}</span>
                                            <span>{cat.max}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Review */}
                        <div>
                            <label className="block text-gray-800 text-sm font-bold uppercase tracking-wide mb-2">
                                Review
                            </label>
                            <textarea
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-24 resize-none text-black"
                                placeholder="Write your review here..."
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-gray-800 text-sm font-bold uppercase tracking-wide mb-2">
                                Images
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-amber-500 hover:text-amber-600 transition-colors"
                            >
                                📷 Choose Images
                            </button>

                            {/* Image Previews */}
                            {images.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <p className="text-sm text-gray-600">Drag images to reorder • Click × to remove</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {images.map((image, index) => (
                                            <div
                                                key={image.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, index)}
                                                onDragEnd={handleDragEnd}
                                                className={`relative group cursor-move rounded-lg overflow-hidden border-2 transition-all ${
                                                    draggedIndex === index ? 'opacity-50 scale-95' : 'border-gray-200 hover:border-amber-300'
                                                }`}
                                            >
                                                <div className="aspect-square relative">
                                                    <Image
                                                        src={image.preview}
                                                        alt={`Preview ${index + 1}`}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded"
                                                >
                                                    ×
                                                </button>
                                                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                                    {index + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold transition-all active:scale-95"
                        >
                            Submit Rating
                        </button>
                    </form>
                    )}
                </div>
            </div>
        </>
    );
}