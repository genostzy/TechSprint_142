import React from 'react';
import { Star, Heart, AlertCircle, CheckCircle2, Globe, Scale, Bell, Zap } from 'lucide-react';
import { Product } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../constants';

interface ProductCardProps {
  product: Product;
  isSaved: boolean;
  onToggleSave: (id: number | string) => void;
  onViewDetails?: (product: Product) => void;
  isInComparison?: boolean;
  onToggleCompare?: (product: Product) => void;
  hasAlert?: boolean;
  onToggleAlert?: (id: number | string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  isSaved, 
  onToggleSave, 
  onViewDetails,
  isInComparison,
  onToggleCompare,
  hasAlert,
  onToggleAlert
}) => {
  return (
    <div 
      className="group bg-white rounded-[32px] shadow-soft hover:shadow-2xl hover:scale-[1.01] border border-gray-100/80 hover:border-accent/20 transition-all duration-500 flex flex-col h-full overflow-hidden cursor-pointer relative"
      onClick={() => onViewDetails && onViewDetails(product)}
    >
      {/* Image Area */}
      <div className="relative h-72 bg-gradient-to-br from-gray-50/50 to-white p-8 overflow-hidden group-hover:from-white group-hover:to-gray-50/30 transition-all duration-500">
        <img 
          src={product.imageUrl || DEFAULT_PRODUCT_IMAGE} 
          alt={product.name} 
          className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105"
        />
        
        {/* Floating Actions */}
        <div className="absolute top-4 right-4 flex flex-col gap-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
            {/* Save Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(product.id);
              }}
              className="p-2.5 bg-white rounded-full shadow-sm border border-gray-100 hover:border-accent hover:text-accent transition-colors"
              title={isSaved ? "Remove from Saved" : "Save for later"}
            >
              <Heart 
                className={`h-5 w-5 ${isSaved ? 'fill-accent text-accent' : 'text-gray-400'}`} 
              />
            </button>

            {/* Alert Button */}
            {onToggleAlert && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAlert(product.id);
                }}
                className={`p-2.5 bg-white rounded-full shadow-sm border border-gray-100 hover:border-accent transition-colors ${
                  hasAlert ? 'text-accent' : 'text-gray-400 hover:text-accent'
                }`}
                title={hasAlert ? "Turn off price alerts" : "Notify me on price drop"}
              >
                <Bell className={`h-5 w-5 ${hasAlert ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* Compare Button */}
            {onToggleCompare && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleCompare(product);
                    }}
                    className={`p-2.5 bg-white rounded-full shadow-sm border border-gray-100 hover:border-espresso transition-colors ${
                        isInComparison 
                            ? 'bg-espresso text-espresso fill-espresso' 
                            : 'text-gray-400 hover:text-espresso'
                    }`}
                    title={isInComparison ? "Remove from Compare" : "Add to Compare"}
                >
                    <Scale className={`h-5 w-5 ${isInComparison ? 'fill-espresso' : ''}`} />
                </button>
            )}
        </div>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
            {product.originalPrice && product.price < product.originalPrice && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm tracking-wide">
                SALE
              </span>
            )}
            {product.isOnline && (
                <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm flex items-center w-fit">
                    <Globe className="h-3 w-3 mr-1" /> ONLINE
                </span>
            )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-bold text-accent uppercase tracking-wider bg-accent/5 px-2 py-1 rounded-md">{product.category}</span>
          
          {/* Dual Rating Display */}
          <div className="flex items-center gap-3">
            {product.storeRating !== undefined && product.storeRating > 0 && (
                <div className="flex items-center space-x-1 text-xs font-bold text-gray-500" title="Store Rating">
                    <Star className="h-3 w-3 fill-gray-400 text-gray-400" />
                    <span>{product.storeRating}</span>
                </div>
            )}
             {product.techSprintRating !== undefined && product.techSprintRating > 0 && (
                <div className="flex items-center space-x-1 text-xs font-bold text-accent" title="TechSprint Value Score">
                    <Zap className="h-3 w-3 fill-accent" />
                    <span>{product.techSprintRating}</span>
                </div>
            )}
          </div>
        </div>

        <h3 className="font-bold text-lg text-espresso mb-2 leading-snug line-clamp-2 group-hover:text-accent transition-colors">{product.name}</h3>
        <p className="text-xs text-gray-500 mb-4 font-medium">
          {product.isOnline ? 'Sold by' : 'Available at'} <span className="text-espresso">{product.store}</span>
        </p>

        <p className="text-sm text-gray-600 line-clamp-2 mb-6 leading-relaxed flex-1">{product.description}</p>

        <div className="border-t border-gray-50 pt-4 mt-auto">
          <div className="flex justify-between items-end mb-4">
            <div>
              {product.originalPrice && (
                <p className="text-xs text-gray-400 line-through font-medium mb-0.5">₱{product.originalPrice.toLocaleString()}</p>
              )}
              <p className="text-xl font-bold text-espresso">
                {product.priceRange ? `₱${product.priceRange}` : `₱${product.price.toLocaleString()}`}
              </p>
            </div>
            <div className={`text-xs flex items-center font-bold ${product.inStock ? 'text-green-600 bg-green-50 px-2 py-1 rounded-full' : 'text-red-500 bg-red-50 px-2 py-1 rounded-full'}`}>
              {product.inStock ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
              {product.inStock ? 'In Stock' : 'No Stock'}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if(onViewDetails) onViewDetails(product);
                }}
                className="flex-1 bg-espresso text-white py-3 rounded-xl font-bold text-sm hover:bg-accent transition-all shadow-lg shadow-gray-200 hover:shadow-accent/20 active:scale-95"
            >
                View Details
            </button>
            {product.productUrl && (
                <a 
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-shrink-0 items-center justify-center bg-gray-100 text-espresso w-12 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    title="Visit Store"
                >
                    <Globe className="h-5 w-5" />
                </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;