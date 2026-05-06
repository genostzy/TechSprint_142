
import React, { useState, MouseEvent, useEffect } from 'react';
import { X, Heart, Star, CheckCircle2, AlertCircle, ShoppingBag, ChevronRight, Scale, Bell, Send, Pencil, Trash2, Save, Zap, TrendingDown, Calendar, ArrowUpDown, BrainCircuit, ThumbsUp, ThumbsDown, MessageSquare, TrendingUp } from 'lucide-react';
import { Product, User as UserType, UserReview } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../constants';
import StoreMap from './StoreMap';
import { dbService } from '../services/dbService';
import { geminiService } from '../services/geminiService';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: number | string) => void;
  isInComparison?: boolean;
  onToggleCompare?: (product: Product) => void;
  hasAlert?: boolean;
  onToggleAlert?: (id: number | string) => void;
  hasStockAlert?: boolean;
  onToggleStockAlert?: (id: number | string) => void;
  // Reviews
  onAddReview?: (productId: number | string, review: { rating: number; comment: string }) => void;
  onEditReview?: (productId: number | string, reviewId: number | string, comment: string, rating: number) => void;
  onDeleteReview?: (productId: number | string, reviewId: number | string) => void;
  currentUser?: UserType | null;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ 
  product, 
  isOpen, 
  onClose, 
  isSaved, 
  onToggleSave,
  isInComparison,
  onToggleCompare,
  hasAlert,
  onToggleAlert,
  hasStockAlert,
  onToggleStockAlert,
  onAddReview,
  onEditReview,
  onDeleteReview,
  currentUser
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ 
    transformOrigin: '50% 50%', 
    transform: 'scale(1)' 
  });
  const [activeTab, setActiveTab] = useState<'specs' | 'history' | 'reviews' | 'ai'>('specs');
  
  // AI Sentiment State
  const [aiAnalysis, setAiAnalysis] = useState<{
    sentiment: string;
    summary: string;
    valueForMoney: string;
    comparisonInsights: string;
    pros: string[];
    cons: string[];
    recommendation: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // New Review State
  const [newReview, setNewReview] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [fetchedReviews, setFetchedReviews] = useState<UserReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Edit Review State
  const [editingReviewId, setEditingReviewId] = useState<number | string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [reviewSort, setReviewSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Reset state when product changes
  useEffect(() => {
    const fetchReviews = async () => {
        if (!isOpen) return;
        setIsLoadingReviews(true);
        try {
            const dbReviews = await dbService.getReviewsForProduct(product.id);
            setFetchedReviews(dbReviews);
        } catch (error) {
            console.error("Failed to fetch reviews", error);
        } finally {
            setIsLoadingReviews(false);
        }
    };

    fetchReviews();

    const timer = setTimeout(() => {
        setNewReview('');
        setNewRating(5);
        setEditingReviewId(null);
        setActiveImageIndex(0);
        setReviewSort('newest');
        setAiAnalysis(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [product.id, isOpen]);

  const handleAnalyzeSentiment = async () => {
    if (aiAnalysis) return;
    setIsAnalyzing(true);
    const result = await geminiService.analyzeProductSentiment(
        product,
        [...(product.userReviews || []), ...fetchedReviews]
    );
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  if (!isOpen) return null;

  const images = product.images && product.images.length > 0 && product.images.every(img => img.trim() !== "")
    ? product.images 
    : [product.imageUrl || DEFAULT_PRODUCT_IMAGE];

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(2.5)'
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transformOrigin: '50% 50%',
      transform: 'scale(1)'
    });
  };

  const handleReviewSubmit = () => {
    if (!newReview.trim() || !onAddReview) return;
    onAddReview(product.id, { rating: newRating, comment: newReview });
    setNewReview('');
    setNewRating(5);
  };

  const startEditing = (review: { id: number | string; comment: string; rating: number }) => {
    setEditingReviewId(review.id);
    setEditComment(review.comment);
    setEditRating(review.rating);
  };

  const cancelEditing = () => {
    setEditingReviewId(null);
    setEditComment('');
    setEditRating(5);
  };

  const saveEditedReview = (reviewId: number | string) => {
    if (!editComment.trim() || !onEditReview) return;
    onEditReview(product.id, reviewId, editComment, editRating);
    setEditingReviewId(null);
  };

  const handleBuyNow = () => {
    if (product.isOnline && product.productUrl) {
      window.open(product.productUrl, '_blank');
    } else {
      // Scroll to Store Map for physical products
      const mapElement = document.getElementById('store-map-section');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-espresso/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-gray-100">
        
        {/* Header / Close Button */}
        <div className="absolute top-8 right-8 z-30">
          <button 
            onClick={onClose}
            className="p-3 bg-white/90 backdrop-blur-xl hover:bg-white text-espresso rounded-full shadow-2xl hover:rotate-90 transition-all duration-300 border border-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-full">
            
            {/* Left Column: Gallery */}
            <div className="p-8 lg:p-10 bg-gray-50/50 flex flex-col border-r border-gray-100">
              {/* Main Image with Zoom */}
              <div 
                className="relative w-full aspect-square bg-white rounded-3xl shadow-sm overflow-hidden cursor-zoom-in mb-6 group border border-gray-100/50"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <img 
                  src={images[activeImageIndex]} 
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-300 ease-out p-8"
                  style={zoomStyle}
                />
                <div className="absolute bottom-4 right-4 bg-espresso/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
                  Hover to Zoom
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex justify-center space-x-5 overflow-x-auto pb-4 no-scrollbar">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative flex-shrink-0 w-24 h-24 bg-white rounded-2xl border-2 transition-all p-3 shadow-sm ${
                        activeImageIndex === idx 
                          ? 'border-accent ring-4 ring-accent/10 scale-105' 
                          : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Details */}
            <div className="p-8 lg:p-10 flex flex-col bg-white">
              
              {/* Breadcrumb / Category */}
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wide text-gray-400 mb-6">
                <span>Products</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-accent">{product.category}</span>
              </div>

              <h2 className="text-3xl font-extrabold text-espresso mb-4 leading-tight">{product.name}</h2>
              
              {/* Rating Breakdown & Stock */}
              <div className="flex flex-wrap gap-4 items-center mb-8">
                {/* TechSprint Rating */}
                <div className="flex items-center space-x-2 bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/20">
                  <Zap className="h-4 w-4 fill-accent text-accent" />
                  <div className="flex flex-col">
                     <span className="font-bold text-espresso text-xs leading-none">TechSprint</span>
                     <span className="font-bold text-accent text-lg leading-none">{product.techSprintRating || product.rating || 0}</span>
                  </div>
                </div>

                 {/* Store Rating */}
                 <div className="flex items-center space-x-2 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                   <div className="flex flex-col">
                     <span className="font-bold text-gray-500 text-xs leading-none">In-Store</span>
                     <span className="font-bold text-yellow-600 text-lg leading-none">{product.storeRating || product.rating || 0}</span>
                  </div>
                </div>

                <div className={`flex items-center text-sm font-bold px-3 py-2 rounded-lg ${product.inStock ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100 italic font-medium'}`}>
                  {product.inStock ? <CheckCircle2 className="h-4 w-4 mr-1.5" /> : <AlertCircle className="h-4 w-4 mr-1.5" />}
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </div>
              </div>

              {!product.inStock && onToggleStockAlert && (
                  <button 
                    onClick={() => onToggleStockAlert(product.id)}
                    className={`w-full mb-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                        hasStockAlert 
                            ? 'bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600' 
                            : 'bg-orange-50 text-orange-600 border-2 border-orange-200 border-dashed hover:bg-orange-100'
                    }`}
                  >
                    <Bell className={`h-5 w-5 ${hasStockAlert ? 'fill-current animate-pulse' : ''}`} />
                    {hasStockAlert ? 'Stock alert active' : 'Notify me when available'}
                  </button>
              )}

              {/* Price Card */}
              <div className="bg-gray-900 rounded-2xl p-6 mb-8 text-white shadow-xl shadow-gray-200">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-xs text-gray-400 mb-1 font-medium">Best price found at <span className="text-white font-bold">{product.store}</span></p>
                    <div className="flex items-baseline space-x-3">
                      <span className="text-4xl font-bold text-white tracking-tight">
                        {product.priceRange ? `₱${product.priceRange}` : `₱${product.price.toLocaleString()}`}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-lg text-gray-500 line-through font-medium">₱{product.originalPrice.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  {product.originalPrice && (
                    <div className="bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                      - {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleBuyNow}
                    className="flex-1 bg-white text-espresso hover:bg-gray-100 py-3.5 rounded-xl font-bold text-md transition-all flex items-center justify-center space-x-2"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    <span>{product.isOnline ? 'View Deal' : 'Check Location'}</span>
                  </button>
                  
                  {/* Actions */}
                  {[
                      { 
                          icon: Bell, 
                          active: product.inStock ? hasAlert : hasStockAlert, 
                          onClick: () => product.inStock 
                            ? (onToggleAlert && onToggleAlert(product.id)) 
                            : (onToggleStockAlert && onToggleStockAlert(product.id)), 
                          visible: true, 
                          title: product.inStock ? "Price Alert" : "Stock Alert"
                      },
                      { 
                          icon: Scale, 
                          active: isInComparison, 
                          onClick: () => onToggleCompare && onToggleCompare(product), 
                          visible: !!onToggleCompare, 
                          title: "Compare" 
                      },
                      { 
                          icon: Heart, 
                          active: isSaved, 
                          onClick: () => onToggleSave(product.id), 
                          visible: true, 
                          title: "Save" 
                      }
                  ].map((btn, i) => btn.visible && (
                     <button 
                        key={i}
                        onClick={btn.onClick}
                        className={`p-3.5 rounded-xl transition-all border ${
                           btn.active 
                            ? 'bg-accent border-accent text-white' 
                            : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                        }`}
                        title={btn.title}
                     >
                        <btn.icon className={`h-5 w-5 ${btn.active ? 'fill-current' : ''}`} />
                     </button>
                  ))}
                </div>
              </div>

               {/* Store Location Map (Physical Only) */}
               {!product.isOnline && (
                  <div id="store-map-section">
                    <StoreMap location={product.location} storeName={product.store} />
                  </div>
               )}

              {/* Description */}
              <div className="mb-10">
                <h3 className="text-sm font-bold text-espresso uppercase tracking-wide mb-3">Overview</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>
              </div>

              {/* Tabs for Specs / History / AI / Reviews */}
              <div className="mt-8 py-6 border-t border-gray-100">
                <div className="flex space-x-6 border-b border-gray-100 mb-6 overflow-x-auto no-scrollbar sticky top-0 bg-white z-10 py-2">
                  {['specs', 'history', 'ai', 'reviews'].map((tab) => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as 'specs' | 'history' | 'ai' | 'reviews')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wide transition-all relative whitespace-nowrap ${
                        activeTab === tab
                            ? 'text-accent' 
                            : 'text-gray-400 hover:text-espresso'
                        }`}
                    >
                        {tab === 'specs' ? 'Specifications' 
                          : tab === 'history' ? 'Price History' 
                          : tab === 'ai' ? (
                            <div className="flex items-center gap-1">
                                <Zap className="h-3.5 w-3.5 fill-accent text-accent" />
                                <span>AI Insights</span>
                            </div>
                          )
                          : `Reviews (${(product.userReviews?.length || 0) + fetchedReviews.length})`}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-full"></div>}
                    </button>
                  ))}
                </div>

                <div className="min-h-[200px]">
                  {activeTab === 'specs' && (
                    product.specs ? (
                      <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <tbody className="divide-y divide-gray-100">
                            {Object.entries(product.specs).map(([key, value], idx) => (
                              <tr key={key} className={idx % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                                <td className="px-5 py-3.5 font-semibold text-espresso w-1/3 text-xs uppercase tracking-wide">{key}</td>
                                <td className="px-5 py-3.5 text-gray-600">{value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-center py-8">No detailed specifications available.</p>
                    )
                  )}

                  {activeTab === 'ai' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {!aiAnalysis && !isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center h-72 bg-gradient-to-br from-accent/5 to-espresso/5 rounded-2xl border border-dashed border-accent/20 p-8 text-center">
                                <div className="bg-accent p-4 rounded-full mb-4 shadow-lg shadow-accent/20">
                                    <BrainCircuit className="h-8 w-8 text-white" />
                                </div>
                                <h4 className="text-espresso font-bold mb-2">Get AI-Powered Consumer Insights</h4>
                                <p className="text-gray-500 text-sm mb-6 max-w-xs">Our AI analyzes community reviews and store data to give you the real truth about this product.</p>
                                <button 
                                    onClick={handleAnalyzeSentiment}
                                    className="bg-espresso text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-accent transition-all flex items-center gap-2 shadow-md shadow-gray-200"
                                >
                                    <Zap className="h-4 w-4 fill-current" /> Analyze Reviews
                                </button>
                            </div>
                        ) : isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center h-72 text-center">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                                    <Zap className="h-6 w-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <p className="mt-6 text-espresso font-bold animate-pulse">Reading community feedback...</p>
                                <p className="text-xs text-gray-400 mt-1">Gemini AI is processing current sentiment</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Summary Card */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                                     <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest text-white ${
                                         aiAnalysis.sentiment === 'Positive' ? 'bg-green-500' : 
                                         aiAnalysis.sentiment === 'Negative' ? 'bg-red-500' : 'bg-orange-500'
                                     }`}>
                                         {aiAnalysis.sentiment} Sentiment
                                     </div>
                                     <div className="mb-4">
                                         <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                             <MessageSquare className="h-3 w-3 text-accent" /> AI Summary
                                         </h4>
                                         <p className="text-espresso text-sm leading-relaxed font-medium">
                                             {aiAnalysis.summary}
                                         </p>
                                     </div>
                                     
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-50 pt-4 mb-4">
                                         <div>
                                             <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                 <TrendingDown className="h-3 w-3 text-accent" /> Value for Money
                                             </h5>
                                             <p className="text-xs text-gray-600 leading-relaxed italic">
                                                 {aiAnalysis.valueForMoney}
                                             </p>
                                         </div>
                                         <div>
                                             <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                 <ArrowUpDown className="h-3 w-3 text-accent" /> Comparison
                                             </h5>
                                             <p className="text-xs text-gray-600 leading-relaxed italic">
                                                 {aiAnalysis.comparisonInsights}
                                             </p>
                                         </div>
                                     </div>

                                     <div className="border-t border-gray-50 pt-4">
                                         <p className="text-xs italic text-gray-500 flex items-center gap-2">
                                             <Zap className="h-3 w-3 fill-accent text-accent" />
                                             AI Verdict: {aiAnalysis.recommendation}
                                         </p>
                                     </div>
                                </div>

                                {/* Pros & Cons */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100/50">
                                        <h5 className="text-green-700 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <ThumbsUp className="h-4 w-4" /> The Good
                                        </h5>
                                        <ul className="space-y-2">
                                            {aiAnalysis.pros.map((pro, i) => (
                                                <li key={i} className="text-gray-600 text-xs flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                                    {pro}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100/50">
                                        <h5 className="text-red-700 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <ThumbsDown className="h-4 w-4" /> Drawbacks
                                        </h5>
                                        <ul className="space-y-2">
                                            {aiAnalysis.cons.map((con, i) => (
                                                <li key={i} className="text-gray-600 text-xs flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                                    {con}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setAiAnalysis(null)}
                                    className="w-full py-4 text-xs font-bold text-gray-400 hover:text-accent transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowUpDown className="h-3 w-3" /> Refresh AI Analysis
                                </button>
                            </div>
                        )}
                    </div>
                  )}

                  {activeTab === 'history' && (
                     <div className="space-y-4">
                        {product.priceHistory && product.priceHistory.length > 0 ? (
                            <div className="space-y-6">
                                {/* Visual Chart Area */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-72">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <TrendingUp className="h-3 w-3 text-accent" /> Price Fluctuations
                                        </h4>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-accent"></div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Trend</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="h-48 w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={[
                                                    ...product.priceHistory.map(item => ({
                                                        date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                                                        price: item.price,
                                                        originalDate: item.date
                                                    })),
                                                    {
                                                        date: 'Today',
                                                        price: product.price,
                                                        originalDate: new Date().toISOString()
                                                    }
                                                ]}
                                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#CE9662" stopOpacity={0.2}/>
                                                        <stop offset="95%" stopColor="#CE9662" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis 
                                                    dataKey="date" 
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
                                                    dy={10}
                                                />
                                                <YAxis 
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
                                                    tickFormatter={(value) => `₱${value.toLocaleString()}`}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1a1a1a', 
                                                        border: 'none', 
                                                        borderRadius: '12px',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                        color: '#fff'
                                                    }}
                                                    itemStyle={{ color: '#white', fontWeight: 'bold' }}
                                                    labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                                                    formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Price']}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="price" 
                                                    stroke="#CE9662" 
                                                    strokeWidth={3}
                                                    fillOpacity={1} 
                                                    fill="url(#colorPrice)" 
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                    {/* Current Price Entry */}
                                    <div className="flex items-center justify-between p-4 border-b border-gray-50 bg-accent/5 hover:bg-accent/10 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-accent p-2 rounded-full">
                                                <ShoppingBag className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-espresso">Current Price</p>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Calendar className="h-3 w-3 mr-1" />
                                                    Today
                                                </div>
                                            </div>
                                        </div>
                                        <p className="font-bold text-accent">₱{product.price.toLocaleString()}</p>
                                    </div>

                                    {product.priceHistory.slice().reverse().map((item, idx) => {
                                        const isDrop = product.priceHistory[product.priceHistory.length - 1 - idx].price > (idx === 0 ? product.price : product.priceHistory[product.priceHistory.length - idx].price);
                                        
                                        return (
                                            <div key={idx} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`p-2 rounded-full ${isDrop ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                        {isDrop ? (
                                                            <TrendingDown className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-espresso">Price Point</p>
                                                        <div className="flex items-center text-xs text-gray-500">
                                                            <Calendar className="h-3 w-3 mr-1" />
                                                            {new Date(item.date).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-espresso">₱{item.price.toLocaleString()}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <TrendingDown className="h-8 w-8 text-gray-300 mb-2" />
                                <p className="text-gray-400 text-sm">No price history available yet.</p>
                            </div>
                        )}
                     </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                      
                      {/* Write Review Section */}
                      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-espresso text-sm">Write a Review</h4>
                            {!currentUser ? (
                                <button 
                                    onClick={() => {
                                        onClose();
                                        // Need a way to trigger login modal from App.tsx via a prop or similar
                                        // But for now just show the message
                                    }}
                                    className="text-[10px] bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-200 transition-colors"
                                >
                                    SIGN IN TO REVIEW
                                </button>
                            ) : (
                                <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">VERIFIED USER</span>
                            )}
                            <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button 
                                key={star}
                                onClick={() => setNewRating(star)}
                                className="focus:outline-none transition-transform hover:scale-110"
                                >
                                <Star 
                                    className={`h-5 w-5 ${star <= newRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                />
                                </button>
                            ))}
                            </div>
                        </div>
                        <div className="relative">
                          <textarea
                            value={newReview}
                            onChange={(e) => setNewReview(e.target.value)}
                            disabled={!currentUser}
                            placeholder={currentUser ? "Share your thoughts about this product..." : "Please sign in to share your review."}
                            className={`w-full p-4 pr-12 rounded-xl border text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none h-24 transition-all ${
                                currentUser ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-70'
                            }`}
                          />
                          <button 
                            onClick={handleReviewSubmit}
                            disabled={!newReview.trim() || !currentUser}
                            className="absolute bottom-3 right-3 p-2 bg-espresso text-white rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Review List Header & Sort */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h4 className="font-bold text-espresso text-lg">
                          Community Reviews
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            ({product.userReviews?.length || 0})
                          </span>
                        </h4>
                        
                        {product.userReviews && product.userReviews.length > 0 && (
                          <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg self-end sm:self-auto">
                            <div className="pl-2 pr-1 text-gray-500">
                              <ArrowUpDown className="h-3.5 w-3.5" />
                            </div>
                            <select 
                              value={reviewSort}
                              onChange={(e) => setReviewSort(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')}
                              className="bg-transparent border-none text-xs font-bold text-espresso focus:ring-0 cursor-pointer py-1.5 pr-8 pl-1 outline-none"
                            >
                              <option value="newest">Newest First</option>
                              <option value="oldest">Oldest First</option>
                              <option value="highest">Highest Rating</option>
                              <option value="lowest">Lowest Rating</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Review List */}
                      <div className="space-y-6">
                        {isLoadingReviews ? (
                            <div className="flex justify-center py-10">
                                <span className="text-sm text-gray-400">Loading reviews...</span>
                            </div>
                        ) : (() => {
                            const allReviews = [...(product.userReviews || []), ...fetchedReviews]
                                .filter((r, i, self) => self.findIndex(t => t.id === r.id) === i)
                                .sort((a, b) => {
                                    if (reviewSort === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
                                    if (reviewSort === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
                                    if (reviewSort === 'highest') return b.rating - a.rating;
                                    if (reviewSort === 'lowest') return a.rating - b.rating;
                                    return 0;
                                });
                            
                            if (allReviews.length === 0) {
                                return (
                                    <div className="text-center py-10 text-gray-400">
                                        <p className="text-sm">No reviews yet.</p>
                                        <p className="text-xs opacity-70 mt-1">Be the first to share your experience!</p>
                                    </div>
                                );
                            }

                            return allReviews.map((review) => (
                                <div key={review.id} className="group">
                                  {editingReviewId === review.id ? (
                                    // Edit Mode
                                    <div className="bg-white p-4 rounded-xl border border-accent/50 shadow-sm animate-in fade-in">
                                      <div className="flex items-center mb-3 space-x-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button 
                                            key={star}
                                            onClick={() => setEditRating(star)}
                                            className="focus:outline-none"
                                          >
                                            <Star 
                                              className={`h-4 w-4 ${star <= editRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                            />
                                          </button>
                                        ))}
                                      </div>
                                      <textarea
                                        value={editComment}
                                        onChange={(e) => setEditComment(e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/20 outline-none mb-3 bg-gray-50"
                                        rows={3}
                                      />
                                      <div className="flex justify-end space-x-2">
                                        <button 
                                          onClick={cancelEditing}
                                          className="flex items-center px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          onClick={() => saveEditedReview(review.id)}
                                          className="flex items-center px-5 py-2 text-xs font-bold text-white bg-espresso hover:bg-accent rounded-lg transition-colors shadow-sm"
                                        >
                                          <Save className="h-3.5 w-3.5 mr-1.5" />
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    // View Mode
                                    <>
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center space-x-3">
                                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-espresso to-gray-800 flex items-center justify-center text-white font-bold text-xs">
                                            {review.user.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-espresso">{review.user}</p>
                                            <div className="flex items-center space-x-1 mt-0.5">
                                              {[...Array(5)].map((_, i) => (
                                                <Star 
                                                  key={i} 
                                                  className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                          <span className="text-xs font-medium text-gray-400">{review.date}</span>
                                          {currentUser && (review.userId === currentUser.uid || currentUser.username === review.user) && (
                                            <div className="flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                onClick={() => startEditing(review)}
                                                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-gray-500 hover:text-accent hover:bg-accent/5 rounded-md transition-all"
                                                title="Edit Review"
                                              >
                                                <Pencil className="h-3.5 w-3.5" />
                                                <span>Edit</span>
                                              </button>
                                              <button 
                                                onClick={() => onDeleteReview && onDeleteReview(product.id, review.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-gray-600 text-sm leading-relaxed pl-12 bg-gray-50/50 p-3 rounded-r-xl rounded-bl-xl border border-transparent hover:border-gray-100 transition-all">
                                        {review.comment}
                                      </p>
                                    </>
                                  )}
                                </div>
                            ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
