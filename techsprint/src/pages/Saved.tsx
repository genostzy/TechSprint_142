
import React, { useState } from 'react';
import ProductCard from '../components/ProductCard';
import { Heart, ArrowUpDown } from 'lucide-react';
import { Product } from '../types';

interface SavedProps {
  products: Product[];
  savedIds: (number | string)[];
  onToggleSave: (id: number | string) => void;
  comparisonList: Product[];
  onToggleCompare: (product: Product) => void;
  alertIds: (number | string)[];
  onToggleAlert: (id: number | string) => void;
  onViewDetails: (product: Product) => void;
}

const Saved: React.FC<SavedProps> = ({ 
  products, 
  savedIds, 
  onToggleSave,
  comparisonList,
  onToggleCompare,
  alertIds,
  onToggleAlert,
  onViewDetails
}) => {
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'techsprint' | 'rating'>('techsprint');
  
  const savedProducts = products
    .filter(p => savedIds.map(String).includes(p.id.toString()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'techsprint': return (b.techSprintRating || 0) - (a.techSprintRating || 0);
        case 'rating': return (b.storeRating || b.rating || 0) - (a.storeRating || a.rating || 0);
        default: return 0;
      }
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[60vh] animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center space-x-3">
            <div className="bg-accent/10 p-2 rounded-lg">
                <Heart className="h-8 w-8 text-accent fill-accent" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-espresso">Saved Items</h1>
                <p className="text-gray-600">Track prices and availability for your build.</p>
            </div>
        </div>

        {savedProducts.length > 0 && (
          <div className="relative inline-block">
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm bg-white text-sm font-medium cursor-pointer w-full md:w-auto"
            >
              <option value="techsprint">Sort: TechSprint Rating</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
              <option value="rating">Sort: Average Store Rating</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
               <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
               </svg>
            </div>
          </div>
        )}
      </div>

      {savedProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {savedProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              isSaved={true}
              onToggleSave={onToggleSave}
              onViewDetails={onViewDetails}
              isInComparison={comparisonList.some(p => p.id.toString() === product.id.toString())}
              onToggleCompare={onToggleCompare}
              hasAlert={alertIds.map(String).includes(product.id.toString())}
              onToggleAlert={onToggleAlert}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center max-w-2xl mx-auto mt-10">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="h-10 w-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-espresso mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-6">Start exploring components and save them here to track price drops.</p>
        </div>
      )}
    </div>
  );
};

export default Saved;
