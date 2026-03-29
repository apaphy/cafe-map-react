"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div className="w-screen h-screen bg-white flex flex-col items-center justify-center gap-12">
      <h1 className="text-10xl md:text-7xl font-light text-black">cafe map</h1>
      
      <Link
        href="/map"
        className="px-8 py-3 bg-stone-600 text-black rounded-full text-lg font-medium hover:bg-gray-800 transition-colors"
      >
        view map
      </Link>
    </div>
  );
}
