import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Star, Zap } from 'lucide-react';
import { Product } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../constants';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, products }) => {
  const [highlightDifferences, setHighlightDifferences] = useState(false);

  if (!isOpen) return null;

  // Extract all unique spec keys from selected products
  const allSpecKeys: string[] = Array.from(new Set(
    products.flatMap(p => p.specs ? Object.keys(p.specs) : [])
  ));

  const hasDifference = (values: unknown[]) => {
    if (values.length <= 1) return false;
    const firstValue = JSON.stringify(values[0]);
    return values.some(v => JSON.stringify(v) !== firstValue);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-espresso/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-espresso">Product Comparison</h2>
            <button
              onClick={() => setHighlightDifferences(!highlightDifferences)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                highlightDifferences 
                  ? 'bg-accent text-white shadow-md' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-accent hover:text-accent'
              }`}
            >
              <Zap className={`h-4 w-4 ${highlightDifferences ? 'animate-pulse' : ''}`} />
              <span>Highlight Differences</span>
            </button>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <th className="w-48 p-4 bg-white sticky left-0 z-10 border-b border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"></th>
                {products.map(product => (
                  <th key={product.id} className="w-1/4 p-6 text-left align-top border-b border-gray-200 min-w-[250px]">
                    <div className="relative aspect-square mb-4 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                      <img 
                        src={product.imageUrl || DEFAULT_PRODUCT_IMAGE} 
                        alt={product.name} 
                        className="w-full h-full object-contain p-4" 
                      />
                    </div>
                    <h3 className="font-bold text-lg text-espresso mb-2 line-clamp-2 h-14">{product.name}</h3>
                    <p className="text-2xl font-bold text-accent mb-1">
                      {product.priceRange ? `₱${product.priceRange}` : `₱${product.price.toLocaleString()}`}
                    </p>
                    {product.originalPrice && (
                       <p className="text-sm text-gray-400 line-through">₱{product.originalPrice.toLocaleString()}</p>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* General Info Rows */}
              <tr className="bg-gray-50/50">
                <td className="p-4 font-bold text-gray-500 text-sm uppercase tracking-wider sticky left-0 bg-gray-50/90 backdrop-blur-sm z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Store</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 text-sm text-espresso font-medium">
                    {p.store}
                    {p.isOnline && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">ONLINE</span>}
                  </td>
                ))}
              </tr>

              {/* TechSprint Rating */}
              <tr>
                <td className="p-4 font-bold text-gray-500 text-sm uppercase tracking-wider sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-accent" /> TechSprint Score
                </td>
                {products.map(p => (
                  <td key={p.id} className="p-4 text-sm">
                    <div className="flex items-center text-accent font-bold">
                        {p.techSprintRating || p.rating || '-'}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Store Rating */}
              <tr className={`${highlightDifferences && hasDifference(products.map(p => p.storeRating || p.rating)) ? 'bg-accent/5' : 'bg-gray-50/50'}`}>
                <td className={`p-4 font-bold text-gray-500 text-sm uppercase tracking-wider sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] flex items-center ${highlightDifferences && hasDifference(products.map(p => p.storeRating || p.rating)) ? 'bg-orange-50/90' : 'bg-gray-50/90 backdrop-blur-sm'}`}>
                    <Star className="h-4 w-4 mr-2 text-yellow-500" /> Store Rating
                </td>
                {products.map(p => (
                  <td key={p.id} className="p-4 text-sm">
                    <div className="flex items-center text-yellow-600 font-bold">
                        {p.storeRating || p.rating || '-'}
                    </div>
                  </td>
                ))}
              </tr>

              <tr className={`${highlightDifferences && hasDifference(products.map(p => p.inStock)) ? 'bg-accent/5' : ''}`}>
                <td className={`p-4 font-bold text-gray-500 text-sm uppercase tracking-wider sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${highlightDifferences && hasDifference(products.map(p => p.inStock)) ? 'bg-orange-50/90' : 'bg-white'}`}>Stock</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 text-sm">
                    <div className={`flex items-center ${p.inStock ? 'text-green-600' : 'text-red-500'} font-medium`}>
                        {p.inStock ? <CheckCircle2 className="h-4 w-4 mr-1.5" /> : <AlertCircle className="h-4 w-4 mr-1.5" />}
                        {p.inStock ? 'In Stock' : 'Out of Stock'}
                    </div>
                  </td>
                ))}
              </tr>

              <tr className="bg-gray-50/50">
                <td className="p-4 font-bold text-gray-500 text-sm uppercase tracking-wider sticky left-0 bg-gray-50/90 backdrop-blur-sm z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Description</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 text-sm text-gray-600 leading-relaxed">
                    {p.description}
                  </td>
                ))}
              </tr>

              {/* Dynamic Spec Rows */}
              {allSpecKeys.length > 0 && (
                <>
                    <tr>
                        <td colSpan={products.length + 1} className="p-4 bg-espresso/5 font-bold text-espresso text-sm uppercase tracking-wider">
                            Technical Specifications
                        </td>
                    </tr>
                    {allSpecKeys.map((key, idx) => {
                        const isDifferent = hasDifference(products.map(p => p.specs?.[key]));
                        const rowBg = highlightDifferences && isDifferent ? 'bg-accent/10 transition-colors' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50');
                        const stickyBg = highlightDifferences && isDifferent ? 'bg-orange-50/90' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/90 backdrop-blur-sm');
                        
                        return (
                            <tr key={key} className={rowBg}>
                                <td className={`p-4 font-bold text-gray-600 text-sm sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${stickyBg}`}>
                                    {key}
                                </td>
                                {products.map(p => (
                                    <td key={p.id} className="p-4 text-sm text-espresso">
                                        {p.specs && p.specs[key] ? p.specs[key] : <span className="text-gray-300">-</span>}
                                    </td >
                                ))}
                            </tr>
                        );
                    })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;