import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

interface StoreMapProps {
  location?: string;
  storeName: string;
}

const StoreMap: React.FC<StoreMapProps> = ({ location, storeName }) => {
  // Default placeholder address if specific location is missing
  const address = location || "Greenhills Shopping Center, San Juan, Metro Manila";

  // Determine the link URL: If it starts with http, use as is; otherwise treat as search query
  const mapUrl = address.trim().startsWith('http') 
    ? address 
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-espresso uppercase tracking-wide flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-accent" />
                Store Location
            </h3>
            <a 
                href={mapUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-accent font-bold hover:underline flex items-center transition-colors"
            >
                Open in Maps <ExternalLink className="h-3 w-3 ml-1" />
            </a>
        </div>
        
        <div className="bg-white rounded-2xl overflow-hidden h-48 w-full border border-gray-100 shadow-sm relative group">
            {/* Iframe Map */}
            <iframe 
                title="Store Location"
                width="100%" 
                height="100%" 
                frameBorder="0" 
                style={{ border: 0 }}
                // If it's a URL, we still try to map the address part for the embed if possible, 
                // otherwise defaulting to address string for query
                src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-full grayscale-[20%] hover:grayscale-0 transition-all duration-500 pointer-events-none" 
            ></iframe>
            
            {/* Floating Address Label - Clickable */}
            <a 
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs bg-white/95 backdrop-blur px-4 py-3 rounded-xl shadow-lg border border-gray-100 flex items-start gap-3 hover:bg-gray-50 transition-colors cursor-pointer group/label"
            >
                <div className="bg-red-50 p-2 rounded-full shrink-0 group-hover/label:bg-red-100 transition-colors">
                    <MapPin className="h-4 w-4 text-red-500 fill-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-espresso truncate">{storeName}</p>
                        <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover/label:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5 line-clamp-2">{address}</p>
                </div>
            </a>
        </div>
    </div>
  );
};

export default StoreMap;