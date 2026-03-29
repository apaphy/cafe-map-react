/**
 * Utility for preloading images to reduce display delay
 */

export const preloadImage = (src: string) => {
  if (typeof window === 'undefined') return;
  
  // Use fetch API for better control and to warm up browser cache
  const preloadLink = document.createElement('link');
  preloadLink.rel = 'preload';
  preloadLink.as = 'image';
  preloadLink.href = src;
  preloadLink.crossOrigin = 'anonymous';
  document.head.appendChild(preloadLink);

  // Also use native Image for double-cache benefit
  const img = new Image();
  img.src = src;
  img.crossOrigin = 'anonymous';
};

export const preloadImages = (sources: string[]) => {
  sources.forEach(preloadImage);
};

/**
 * Preload adjacent images in a gallery with expanded radius
 * @param images - Array of image objects with src property
 * @param currentIndex - Current image index
 * @param preloadCount - Number of images ahead and behind to preload (default: 2)
 */
export const preloadAdjacentImages = (
  images: Array<{ src: string }>,
  currentIndex: number,
  preloadCount: number = 3
) => {
  if (!images || images.length === 0) return;

  const imagesToPreload: string[] = [];

  // Preload next images
  for (let i = 1; i <= preloadCount; i++) {
    const nextIndex = (currentIndex + i) % images.length;
    imagesToPreload.push(images[nextIndex].src);
  }

  // Preload previous images
  for (let i = 1; i <= preloadCount; i++) {
    const prevIndex = (currentIndex - i + images.length) % images.length;
    imagesToPreload.push(images[prevIndex].src);
  }

  preloadImages(imagesToPreload);
};

/**
 * Preload all images in a review
 */
export const preloadAllReviewImages = (images: Array<{ src: string }>) => {
  if (!images || images.length === 0) return;
  preloadImages(images.map(img => img.src));
};
