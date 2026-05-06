
import React, { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Product } from '../types';
import StoreMap from '../components/StoreMap';

interface StoreLocatorProps {
  products: Product[];
}

const StoreLocator: React.FC<StoreLocatorProps> = ({ products }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique physical stores from products
  // We create a Map keyed by "StoreName-Location" to deduplicate
  const stores = products.reduce((acc, product) => {
    if (!product.isOnline && product.location) {
      const key = `${product.store}-${product.location}`;
      if (!acc.has(key)) {
        acc.set(key, {
          name: product.store,
          location: product.location,
          productsCount: 1
        });
      } else {
        const existing = acc.get(key)!;
        existing.productsCount++;
      }
    }
    return acc;
  }, new Map<string, { name: string; location: string; productsCount: number }>());

  const uniqueStores = Array.from(stores.values());

  const filteredStores = uniqueStores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-espresso mb-4">Store Locator</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Find physical retailers near you carrying the tech you need.
          These locations are verified from our product listings.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-12 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by store name or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none shadow-sm"
        />
      </div>

      {filteredStores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredStores.map((store, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden p-1">
                <div className="p-1">
                  <StoreMap location={store.location} storeName={store.name} />
                </div>
                <div className="px-4 pb-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase">Physical Store</span>
                        <span className="text-xs text-gray-500 font-medium">{store.productsCount} products listed</span>
                    </div>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-espresso mb-1">No Locations Found</h3>
            <p className="text-gray-500 text-sm">
                {uniqueStores.length === 0 
                    ? "No physical store products have been added to the inventory yet." 
                    : "Try adjusting your search terms."}
            </p>
        </div>
      )}
    </div>
  );
};

export default StoreLocator;
