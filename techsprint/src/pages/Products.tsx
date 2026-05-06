
import React, { useState, useEffect, useRef } from 'react';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { Search, Filter, ArrowUpDown, Zap, Loader2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface ProductsProps {
  products: Product[];
  savedIds: (number | string)[];
  onToggleSave: (id: number | string) => void;
  comparisonList: Product[];
  onToggleCompare: (product: Product) => void;
  alertIds: (number | string)[];
  onToggleAlert: (id: number | string) => void;
  onViewDetails: (product: Product) => void;
}

const Products: React.FC<ProductsProps> = ({ 
  products, 
  savedIds, 
  onToggleSave,
  comparisonList,
  onToggleCompare,
  alertIds,
  onToggleAlert,
  onViewDetails
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'techsprint' | 'rating'>('techsprint');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async () => {
    if (loadingSuggestions) return;
    setLoadingSuggestions(true);
    const results = await geminiService.generateSearchSuggestions(searchTerm);
    setSuggestions(results);
    setLoadingSuggestions(false);
  };

  const handleSearchFocus = () => {
    setShowSuggestions(true);
    if (suggestions.length === 0) {
      fetchSuggestions();
    }
  };

  const categories = ['All', 'GPU', 'CPU', 'Monitor', 'Laptop', 'Peripherals'];

  const toggleCategory = (category: string) => {
    if (category === 'All') {
      setSelectedCategories(['All']);
      return;
    }

    setSelectedCategories(prev => {
      if (prev.includes('All')) {
        return [category];
      }
      if (prev.includes(category)) {
        const newSelection = prev.filter(c => c !== category);
        return newSelection.length === 0 ? ['All'] : newSelection;
      }
      return [...prev, category];
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.store.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategories.includes('All') || selectedCategories.includes(product.category);
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'techsprint':
        return (b.techSprintRating || 0) - (a.techSprintRating || 0);
      case 'rating':
        return (b.storeRating || b.rating || 0) - (a.storeRating || a.rating || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-500 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-espresso mb-2">Marketplace</h1>
        <p className="text-gray-600">Compare prices from top Philippine retailers.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-10 sticky top-24 z-30 bg-cream/95 backdrop-blur py-4 -mx-4 px-4 md:mx-0 md:px-0 rounded-lg md:static md:bg-transparent md:backdrop-blur-0">
        <div className="relative flex-1" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input 
            type="text" 
            placeholder="Search for 'RTX 3060' or 'DynaQuest'..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleSearchFocus}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm"
          />

          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
              <div className="p-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <Zap className="h-3 w-3 mr-1 text-accent" /> AI Suggestions
                </span>
                {loadingSuggestions && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
              </div>
              <div className="p-1">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchTerm(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-accent/5 hover:text-accent rounded-lg transition-colors flex items-center"
                  >
                    <Search className="h-3.5 w-3.5 mr-3 text-gray-300" />
                    {suggestion}
                  </button>
                ))}
                {suggestions.length === 0 && !loadingSuggestions && (
                   <div className="p-4 text-center text-xs text-gray-400">
                      Loading trending hardware...
                   </div>
                )}
              </div>
              <div className="p-2 border-t border-gray-50 text-center">
                 <button 
                   onClick={fetchSuggestions}
                   className="text-[10px] text-accent font-bold hover:underline"
                 >
                   Refresh Trends
                 </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="appearance-none pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm bg-white text-sm font-medium cursor-pointer"
          >
            <option value="techsprint">Sort: TechSprint Rating</option>
            <option value="price-asc">Sort: Price (Low to High)</option>
            <option value="price-desc">Sort: Price (High to Low)</option>
            <option value="rating">Sort: Average Store Rating</option>
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <div className="hidden md:flex items-center text-sm font-bold text-gray-400 uppercase tracking-wider mr-2">
            <Filter className="h-4 w-4 mr-1" /> Filters:
          </div>
          {categories.map(cat => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-espresso text-white shadow-md ring-2 ring-espresso ring-offset-1 ring-offset-cream' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              isSaved={savedIds.map(String).includes(product.id.toString())}
              onToggleSave={onToggleSave}
              onViewDetails={onViewDetails}
              isInComparison={comparisonList.some(p => p.id === product.id)}
              onToggleCompare={onToggleCompare}
              hasAlert={alertIds.map(String).includes(product.id.toString())}
              onToggleAlert={onToggleAlert}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-espresso">No products found</h3>
          <p className="text-gray-500">Try adjusting your search terms or category filters.</p>
        </div>
      )}
    </div>
  );
};

export default Products;
