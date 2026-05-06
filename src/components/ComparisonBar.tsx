import React from 'react';
import { X, ArrowRightLeft, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../constants';

interface ComparisonBarProps {
  comparisonList: Product[];
  onRemove: (id: number) => void;
  onClear: () => void;
  onCompare: () => void;
}

const ComparisonBar: React.FC<ComparisonBarProps> = ({ 
  comparisonList, 
  onRemove, 
  onClear, 
  onCompare 
}) => {
  if (comparisonList.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 animate-in slide-in-from-bottom-full duration-300 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center space-x-4 overflow-x-auto w-full sm:w-auto no-scrollbar pb-2 sm:pb-0">
          <span className="text-sm font-bold text-espresso whitespace-nowrap mr-2">
            Compare ({comparisonList.length}/4):
          </span>
          
          {comparisonList.map((product) => (
            <div key={product.id} className="relative flex-shrink-0 group">
              <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                <img src={product.imageUrl || DEFAULT_PRODUCT_IMAGE} alt={product.name} className="w-full h-full object-contain" />
              </div>
              <button
                onClick={() => onRemove(product.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Placeholder slots */}
          {[...Array(Math.max(0, 4 - comparisonList.length))].map((_, i) => (
            <div key={`placeholder-${i}`} className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-gray-400">{i + 1 + comparisonList.length}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button 
            onClick={onClear}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-500 transition-colors flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </button>
          <button 
            onClick={onCompare}
            disabled={comparisonList.length < 2}
            className="flex-1 sm:flex-none bg-espresso disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full font-bold text-sm flex items-center justify-center transition-all hover:bg-espresso/90 shadow-md"
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Compare Now
          </button>
        </div>

      </div>
    </div>
  );
};

export default ComparisonBar;