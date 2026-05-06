
export interface UserReview {
  id: number | string;
  user: string;
  rating: number;
  comment: string;
  date: string;
  userId?: string;
  productId?: string | number;
}

export interface PriceHistoryItem {
  price: number;
  date: string;
}

export interface Product {
  id: number | string;
  name: string;
  category: string;
  price: number; // Used for sorting/filtering (lowest price in range)
  priceRange?: string; // Display string for ranges (e.g. "5000-9000")
  originalPrice?: number;
  priceHistory?: PriceHistoryItem[];
  store: string;
  imageUrl: string;
  
  // Ratings
  rating: number; // Kept for legacy compatibility/calculation
  storeRating?: number; // Rating from the retailer (e.g. Shopee Star)
  techSprintRating?: number; // Aggregator's AI/Curated Score

  reviews: number;
  inStock: boolean;
  description: string;
  // New fields for detailed view
  images?: string[];
  specs?: Record<string, string>;
  userReviews?: UserReview[];
  // Admin / Store Type fields
  isOnline: boolean;
  productUrl?: string;
  location?: string; // For physical stores (can overlap with store name)
}

export interface Review {
  id: number;
  user: string;
  text: string;
  rating: number;
  productName: string;
}

export interface User {
  uid: string;
  username: string;
  email?: string;
  avatarUrl: string;
  isAdmin: boolean;
  password?: string;
}

export interface Notification {
  id: number | string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert';
  userId?: string;
  date?: string;
  read?: boolean;
  productId?: string;
  oldPrice?: number;
  newPrice?: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'maintenance' | 'update' | 'event' | 'info';
  active: boolean;
  priority: 'low' | 'medium' | 'high';
}

export type PageView = 'home' | 'products' | 'about' | 'saved' | 'admin' | 'profile' | 'terms' | 'stores' | 'help' | 'announcements';
