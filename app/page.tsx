"use client";
import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";
import React, { useContext, useEffect, useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { LocationModal } from "./locationmodal";
import { CafeRatingModal } from "./caferatingmodal";
import { fetchCafeReviews } from "@/app/supabase/cafe"
import { AuthContext } from "@/app/supabase/client"

const ratingColors = {3: "#22c55e", 2: "#eab308", 1: "#ef4444"}
function MapPoint({loc, onClick})
{
    const firstReview = loc.reviews[0]
    const [isHovered, setIsHovered] = React.useState(false);
    const color = ratingColors[firstReview.sentiment]
    return <AdvancedMarker
            position={{ lat: loc.lat, lng: loc.long }}
            onClick={() => onClick(loc)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={'relative flex flex-col items-center'}>
                <svg width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill={color} stroke="white" strokeWidth="2" />
                    <circle cx="16" cy="16" r="8" fill="white" opacity="0.3" />
                </svg>
                <div
                    className={`absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap pointer-events-none transition-all duration-200 ${
                        isHovered ? 'opacity-100 visible' : 'opacity-0 invisible'
                    }`}
                    style={{ zIndex: 9999 }}
                >
                    {loc.name}
                </div>
            </div>
        </AdvancedMarker>
}

export default function Home() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const [ selectedLocation, setSelectedLocation ] = useState(null);
    const [ locationModalOpen, setLocationModelOpen ] = useState(false);
    const [ cafeRatingModalOpen, setCafeRatingModalOpen ] = useState(false);

    if (!apiKey) {
        throw new Error("Missing Google Maps API key in environment variables.");
    }

    // Fetch locations using react-query
    const { data: locations = [], isLoading, error } = useQuery({
        queryKey: ['cafeLocations'],
        queryFn: fetchCafeReviews,
    });

    const openModal = (location) => {
        setSelectedLocation(location);
        setLocationModelOpen(true);
    }

    return (
        <div style={{ height: "100vh", width: "100%" }}>
            {/* Loading Screen */}
            {isLoading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-lg font-semibold text-gray-700">Loading cafe locations...</p>
                    </div>
                </div>
            )}

            {/* Error Screen */}
            {error && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
                        <p className="text-lg font-semibold text-red-600 mb-2">Error Loading Cafes</p>
                        <p className="text-gray-700">{error.message || 'An error occurred while loading cafe locations.'}</p>
                    </div>
                </div>
            )}

            <APIProvider apiKey={apiKey}>
                <Map            
                    mapId="9c00eaefadcbf442cd3bb7a8"
                    defaultCenter={{ lat: 34.05, lng: -118.24 }}
                    defaultZoom={10}
                    style={{ width: "100%", height: "100%" }}
                    controlSize={40}
                    disableDefaultUI={true}
                >
                {!isLoading && locations.map((loc, idx) => (
                    <MapPoint loc={loc} key={idx} onClick={openModal}/>
                ))}
                </Map>
            </APIProvider>

            {/* Plus Button */}
            <button
                onClick={() => setCafeRatingModalOpen(true)}
                className="fixed bottom-6 left-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-amber-500 hover:from-violet-700 hover:to-amber-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold transition-all active:scale-95 z-40"
                aria-label="Add cafe rating"
            >
                +
            </button>

            <LocationModal 
                isOpen={locationModalOpen}
                location={selectedLocation}
                onClose={() => setLocationModelOpen(false)}
            />
            <CafeRatingModal 
                isOpen={cafeRatingModalOpen}
                onClose={() => setCafeRatingModalOpen(false)}
                onSubmit={async (data) => {
                    locations.push(data)
                }}
            />
        </div>
    );
}
