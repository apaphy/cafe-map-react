'use server'

import { createSupabaseServer } from "../supabase/server";

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

export async function fetchCafeReviews() {
    const supabase = await createSupabaseServer()

    try {
        const visited = await supabase
            .from('reviews')
            .select('cafe')
            .then(data => data.data?.map(r => r.cafe) || [])
        
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                ratings (*, rating-categories(*)),
                review-images (*)
            `) 
        
        reviews.forEach(review => {
            review['review-images'].forEach(x => x.src = transformImageUrl(x.src))
        })

        const { data: cafes, cafeError} = await supabase
            .from('cafes')
            .select('*')
            .in('id', visited)
        
        cafes.map(cafe => {
            const cafe_reviews = reviews.filter(review => review.cafe == cafe.id)
            cafe.reviews = cafe_reviews
            return cafe
        })
        
        return cafes
    } catch (error) {
        console.error("Error loading cafes with reviews:", error);
        throw error;
    }
}

export async function fetchRatingCategories() {
    const supabase = await createSupabaseServer()

    try {
        const { data: categories, error } = await supabase
            .from('rating-categories')
            .select('id, category, max-value, min-value')
        
        if (error) {
            console.error("Error fetching rating categories:", error);
            throw error;
        }

        // Transform the data to match the expected format
        return categories.map(cat => ({
            id: cat.id,
            category: cat.category,
            min: cat['min-value'],
            max: cat['max-value']
        }));
    } catch (error) {
        console.error("Error loading rating categories:", error);
        throw error;
    }
}