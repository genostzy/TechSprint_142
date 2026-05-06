
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, ArrowUpDown, Plus, Loader2, Globe, MapPin, X, Trash2, Tag, Pencil, Upload, Image as ImageIcon, Zap, Star, AlertTriangle, Shield, Bell, Settings, Megaphone, CheckCircle2, AlertCircle, Calendar, BarChart3, PieChart as PieChartIcon, TrendingUp, Package } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Product, Announcement } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../constants';
import { generateProductDetails, generatePriceEstimate, geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { EmailService } from '../services/emailService';

interface AdminDashboardProps {
  products: Product[];
  currentUser: User | null;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: number | string) => void;
  onSimulatePriceDrop?: () => void;
  onNotify?: (title: string, message: string, type: 'info' | 'success' | 'alert') => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ products, currentUser, onAddProduct, onUpdateProduct, onDeleteProduct, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'analytics' | 'broadcasts' | 'settings'>('inventory');
  const [storeType, setStoreType] = useState<'online' | 'physical'>('online');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetched, setIsFetched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile Update State
  const [adminAvatar, setAdminAvatar] = useState(currentUser?.avatarUrl || '');
  const [adminUsername, setAdminUsername] = useState(currentUser?.username || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Edit Mode State
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventorySortBy, setInventorySortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'techsprint' | 'rating'>('newest');

  // Announcement Management State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '',
    content: '',
    type: 'info' as Announcement['type'],
    priority: 'low' as Announcement['priority'],
    active: true,
    sendEmailNotification: false
  });
  const [isAnnouncementProcessing, setIsAnnouncementProcessing] = useState(false);
  const [isGmailAuthorized, setIsGmailAuthorized] = useState(EmailService.hasToken());

  // AI Sentiment State
  const [aiSentimentSummary, setAiSentimentSummary] = useState<string>('');
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);

  // Analytics Data
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
        counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [products]);

  const priceChartData = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    products.forEach(p => {
       if (!sums[p.category]) sums[p.category] = { total: 0, count: 0 };
       sums[p.category].total += p.price;
       sums[p.category].count += 1;
    });
    return Object.entries(sums).map(([name, data]) => ({
        name,
        avg: Math.round(data.total / data.count)
    }));
  }, [products]);

  const reviewDistributionData = useMemo(() => {
    const distribution = [
        { name: '5 Stars', value: 0, color: '#27AE60' },
        { name: '4 Stars', value: 0, color: '#2ECC71' },
        { name: '3 Stars', value: 0, color: '#F1C40F' },
        { name: '2 Stars', value: 0, color: '#E67E22' },
        { name: '1 Star', value: 0, color: '#E74C3C' },
    ];
    
    products.forEach(p => {
        (p.userReviews || []).forEach(r => {
            const index = 5 - Math.min(5, Math.max(1, Math.round(r.rating)));
            if (index >= 0 && index < 5) {
                distribution[index].value += 1;
            }
        });
    });
    return distribution;
  }, [products]);

  const filteredInventory = useMemo(() => {
    return products
      .filter(p => 
        p.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(inventorySearchTerm.toLowerCase())
      )
      .sort((a, b) => {
        switch (inventorySortBy) {
          case 'price-asc': return a.price - b.price;
          case 'price-desc': return b.price - a.price;
          case 'techsprint': return (b.techSprintRating || 0) - (a.techSprintRating || 0);
          case 'rating': return (b.storeRating || b.rating || 0) - (a.storeRating || a.rating || 0);
          case 'newest':
          default:
            // Since there's no definite 'date' for products in the type shown, 
            // and assuming ID might be chronological if it's Date.now().toString()
            return String(b.id).localeCompare(String(a.id));
        }
      });
  }, [products, inventorySearchTerm, inventorySortBy]);

  const handleAnalyzeGlobalSentiment = useCallback(async () => {
    if (products.length === 0 || isAnalyzingSentiment || aiSentimentSummary) return;
    setIsAnalyzingSentiment(true);
    try {
      const summary = await geminiService.summarizeAllReviews(products);
      setAiSentimentSummary(summary);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzingSentiment(false);
    }
  }, [products, isAnalyzingSentiment, aiSentimentSummary]);

  useEffect(() => {
    // 1. Analytics summary generation
    if (activeTab === 'analytics') {
      const timer = setTimeout(() => {
        handleAnalyzeGlobalSentiment();
      }, 0);
      return () => clearTimeout(timer);
    }
    
    // 2. Announcements listener
    if (activeTab === 'broadcasts') {
      const unsubscribe = dbService.listenAnnouncements((data) => {
        setAnnouncements(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      });
      return () => unsubscribe();
    }
  }, [activeTab, handleAnalyzeGlobalSentiment]);

  const handleEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncementId(ann.id);
    setAnnouncementFormData({
      title: ann.title || '',
      content: ann.content || '',
      type: ann.type || 'info',
      priority: ann.priority || 'low',
      active: ann.active ?? true,
      sendEmailNotification: false
    });
    // Scroll to top of broadcasts section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelAnnouncementEdit = () => {
    setEditingAnnouncementId(null);
    setAnnouncementFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 'low',
      active: true,
      sendEmailNotification: false
    });
  };

  const handleUpdateAdminProfile = async () => {
    if (!currentUser) return;
    setIsUpdatingProfile(true);
    try {
        await dbService.updateUser(currentUser.uid, { 
            avatarUrl: adminAvatar,
            username: adminUsername
        });
        alert('Profile updated! Changes will appear after refresh.');
    } catch (e) {
        console.error(e);
        alert('Failed to update profile.');
    } finally {
        setIsUpdatingProfile(false);
    }
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnnouncementProcessing(true);

    try {
      const payload: Announcement = {
        id: editingAnnouncementId || `ann_${Date.now()}`,
        title: announcementFormData.title,
        content: announcementFormData.content,
        type: announcementFormData.type,
        priority: announcementFormData.priority,
        active: announcementFormData.active,
        date: editingAnnouncementId ? (announcements.find(a => a.id === editingAnnouncementId)?.date || new Date().toISOString()) : new Date().toISOString()
      };

      if (editingAnnouncementId) {
        await dbService.updateAnnouncement(payload);
        alert('Announcement updated!');
        handleCancelAnnouncementEdit();
      } else {
        let broadcastSuccess = false;
        if (announcementFormData.sendEmailNotification) {
            // Get Gmail authorized token (already potentially cached)
            const token = await EmailService.getGmailToken();
            
            if (token) {
                const emails = await dbService.getValidEmailsForBroadcast();
                if (emails.length > 0) {
                    await EmailService.broadcastAnnouncement(token, emails, payload.title, payload.content);
                    broadcastSuccess = true;
                }
            }
        }
        await dbService.addAnnouncement(payload);
        
        let msg = 'Announcement posted successfully!';
        if (announcementFormData.sendEmailNotification && broadcastSuccess) {
            msg += ' Emails have been broadcasted to all active users.';
        } else if (announcementFormData.sendEmailNotification && !broadcastSuccess) {
            msg += ' However, email broadcasting was skipped or failed.';
        }
        alert(msg);
        handleCancelAnnouncementEdit();
      }
    } catch (error) {
      console.error("Failed to save announcement", error);
      alert('Error saving announcement. Check console for details.');
    } finally {
      setIsAnnouncementProcessing(false);
    }
  };

  const handleConfirmDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    try {
      await dbService.deleteAnnouncement(announcementToDelete.id);
      setAnnouncementToDelete(null);
    } catch (error) {
      console.error("Failed to delete announcement", error);
    }
  };

  // Form State - Price is now string to handle inputs like "5000-9000"
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '', 
    category: 'GPU',
    store: '',
    productUrl: '',
    imageUrl: '',
    storeRating: 0,
    techSprintRating: 0,
    inStock: true,
    location: '',
    specs: undefined as Record<string, string> | undefined
  });

  const categories = ['GPU', 'CPU', 'Monitor', 'Laptop', 'Peripherals'];

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setStoreType(product.isOnline ? 'online' : 'physical');
    setIsFetched(true); // Always expand the form when editing
    
    setFormData({
      name: product.name,
      description: product.description,
      // If priceRange exists, show that, otherwise convert numeric price to string
      price: product.priceRange || product.price.toString(),
      category: product.category,
      store: product.store,
      productUrl: product.productUrl || '',
      imageUrl: product.imageUrl,
      storeRating: product.storeRating || product.rating || 0,
      techSprintRating: product.techSprintRating || product.rating || 0,
      inStock: product.inStock,
      location: product.location || '',
      specs: product.specs
    });

    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
        name: '',
        description: '',
        price: '',
        category: 'GPU',
        store: '',
        productUrl: '',
        imageUrl: '',
        storeRating: 0,
        techSprintRating: 0,
        inStock: true,
        location: '',
        specs: undefined
    });
    setIsFetched(false);
    setStoreType('online');
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  // Image Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
        processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit.');
        return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // AI-Powered Auto-Fetch
  const handleAutoFetch = async () => {
    if (!formData.productUrl) return;
    setIsProcessing(true);

    try {
      const details = await generateProductDetails(formData.productUrl);
      
      if (details) {
        setFormData(prev => ({
          ...prev,
          name: details.name || "Fetched Product",
          description: details.description || "No description available.",
          price: details.price ? details.price.toString() : '',
          category: categories.includes(details.category) ? details.category : 'Peripherals',
          store: details.store || "Online Store",
          imageUrl: prev.imageUrl || "", 
          storeRating: details.storeRating || 4.0,
          techSprintRating: details.techSprintRating || 4.5,
          inStock: true,
          specs: details.specs || prev.specs
        }));
        setIsFetched(true);
      } else {
        alert("Could not extract details. Please try again or fill manually.");
      }
    } catch (error) {
      console.error("Auto-fetch failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFetchPrice = async () => {
    if (!formData.productUrl) return;
    setIsProcessing(true);

    try {
      const price = await generatePriceEstimate(formData.productUrl);
      
      if (price) {
        setFormData(prev => ({ ...prev, price: price.toString() }));
        if (!isFetched) {
            alert(`Price estimated: ₱${price.toLocaleString()}`);
        }
      }
    } catch (error) {
        console.error("Price fetch failed", error);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for Physical Store
    if (storeType === 'physical') {
        if (!formData.store.trim()) {
            alert("Store Name is required for physical products.");
            return;
        }
        if (!formData.location.trim()) {
            alert("Location is required for physical products to display on the map.");
            return;
        }
    }

    // Parse Price Logic
    let numericPrice = 0;
    let priceRange: string | undefined = undefined;

    // Clean the input string (remove currency symbols if user typed them)
    const cleanPriceInput = formData.price.replace(/[^0-9.-]/g, '');

    if (cleanPriceInput.includes('-')) {
        // Range detected (e.g. "5000-9000")
        priceRange = cleanPriceInput;
        // Use the first number as the 'sorting' price
        const parts = cleanPriceInput.split('-');
        numericPrice = parseFloat(parts[0]);
    } else {
        // Single number
        numericPrice = parseFloat(cleanPriceInput);
    }

    if (isNaN(numericPrice)) numericPrice = 0;

    // Retrieve original product if editing
    const originalProduct = editingId ? products.find(p => p.id === editingId) : null;

    const productPayload: Product = {
      id: editingId ? editingId : Date.now().toString(),
      reviews: originalProduct?.reviews || 0,
      ...(originalProduct || {}),
      
      name: formData.name,
      description: formData.description,
      price: numericPrice,
      priceRange: priceRange, // Save the range string
      originalPrice: editingId ? (originalProduct?.originalPrice ? Math.max(originalProduct.originalPrice, numericPrice) : numericPrice) : numericPrice,
      category: formData.category,
      store: formData.store, 
      location: storeType === 'physical' ? formData.location : undefined,
      productUrl: storeType === 'online' ? formData.productUrl : undefined,
      imageUrl: formData.imageUrl || (originalProduct?.imageUrl || DEFAULT_PRODUCT_IMAGE),
      
      // Update Ratings
      rating: formData.techSprintRating || 0, // Fallback for sorting
      storeRating: Number(formData.storeRating),
      techSprintRating: Number(formData.techSprintRating),

      inStock: formData.inStock,
      isOnline: storeType === 'online',
      specs: formData.specs,
    };

    if (editingId) {
        onUpdateProduct(productPayload);
        if (onNotify) {
            onNotify('Product Updated', `${formData.name} price has been updated to ₱${numericPrice.toLocaleString()}.`, 'success');
        } else {
            alert('Product updated successfully!');
        }
        handleCancelEdit();
    } else {
        onAddProduct(productPayload);
        // Reset form
        setFormData({
          name: '',
          description: '',
          price: '',
          category: 'GPU',
          store: '',
          productUrl: '',
          imageUrl: '',
          storeRating: 0,
          techSprintRating: 0,
          inStock: true,
          location: ''
        });
        setIsFetched(false);
        if (onNotify) {
            onNotify('Product Added', `${formData.name} has been added to inventory.`, 'success');
        } else {
            alert('Product added successfully!');
        }
    }
  };

  // Render helper for Image Upload UI to avoid React component re-definition issues
  const renderImageUploadSection = () => (
    <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Image</label>
        
        {formData.imageUrl ? (
            <div className="relative w-full h-48 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden group">
                <img 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="bg-white text-red-500 px-4 py-2 rounded-full font-bold text-sm hover:bg-red-50 flex items-center"
                    >
                        <Trash2 className="h-4 w-4 mr-2" /> Remove Image
                    </button>
                </div>
            </div>
        ) : (
            <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileInput}
            >
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <div className="bg-accent/10 p-3 rounded-full mb-3">
                    <Upload className="h-6 w-6 text-accent" />
                </div>
                <p className="text-sm font-bold text-espresso mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mb-4">SVG, PNG, JPG or GIF (max. 2MB)</p>
                
                <div className="relative w-full max-w-xs" onClick={e => e.stopPropagation()}>
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-400">Or paste URL</span>
                    </div>
                </div>

                <div className="mt-3 w-full max-w-xs flex items-center" onClick={e => e.stopPropagation()}>
                    <ImageIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <input 
                        type="url"
                        placeholder="https://"
                        className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-accent outline-none"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    />
                </div>
            </div>
        )}
    </div>
  );

  // Reusable Rating Inputs
  const renderRatingInputs = () => (
      <div className="grid grid-cols-2 gap-4">
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center">
                  <Star className="h-3 w-3 mr-1" /> Store Rating
              </label>
              <input 
                  type="number" 
                  min="0" max="5" step="0.1"
                  value={formData.storeRating} 
                  onChange={(e) => setFormData({...formData, storeRating: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none" 
              />
          </div>
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center text-accent">
                  <Zap className="h-3 w-3 mr-1" /> TechSprint Rating
              </label>
              <input 
                  type="number" 
                  min="0" max="5" step="0.1"
                  value={formData.techSprintRating} 
                  onChange={(e) => setFormData({...formData, techSprintRating: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-accent/30 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none" 
              />
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold text-espresso">Admin Dashboard</h1>
            <p className="text-gray-600">Site management and oversight.</p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="bg-accent/10 text-accent px-4 py-2 rounded-full font-bold text-sm flex items-center">
                <Shield className="h-4 w-4 mr-2" /> Admin Control
            </div>
        </div>
      </div>

      {/* Navigation Tabs - Focused on Admin Tasks */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
         {[
            { id: 'inventory', label: 'Inventory Management', icon: Tag },
            { id: 'analytics', label: 'Market Insights', icon: Zap },
            { id: 'broadcasts', label: 'Global Notifications', icon: Bell },
            { id: 'settings', label: 'Store Settings', icon: Settings }
         ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'inventory' | 'analytics' | 'broadcasts' | 'settings')}
                className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
                    activeTab === tab.id 
                        ? 'border-accent text-accent bg-accent/5' 
                        : 'border-transparent text-gray-500 hover:text-espresso hover:bg-gray-50'
                }`}
            >
                <tab.icon className="h-4 w-4" />
                {tab.label}
            </button>
         ))}
      </div>

      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Critical Stock Overview */}
            {products.some(p => !p.inStock) && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-500 p-3 rounded-xl shadow-lg shadow-red-200">
                            <Package className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900">Inventory Alert</h3>
                            <p className="text-red-700 text-sm">You have <span className="font-black underline">{products.filter(p => !p.inStock).length} products</span> currently out of stock. Users may be waiting for notifications.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Product Form */}
            <div className="lg:col-span-1">
              <div className={`bg-white rounded-2xl shadow-sm border ${editingId ? 'border-accent ring-1 ring-accent' : 'border-gray-100'} overflow-hidden sticky top-24 transition-all`}>
                <div className={`${editingId ? 'bg-accent' : 'bg-espresso'} p-4 text-white flex items-center justify-between`}>
                    <span className="font-bold flex items-center">
                        {editingId ? <Pencil className="h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                        {editingId ? 'Edit Product' : 'Add New Product'}
                    </span>
                    {editingId && (
                        <button 
                            onClick={handleCancelEdit}
                            className="flex items-center text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                        >
                            <X className="h-3 w-3 mr-1" /> Cancel
                        </button>
                    )}
                </div>
                
                <div className="p-6">
                    {/* Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                        <button
                            onClick={() => { setStoreType('online'); if(!editingId) setIsFetched(false); }}
                            className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${
                                storeType === 'online' ? 'bg-white text-espresso shadow-sm' : 'text-gray-500 hover:text-espresso'
                            }`}
                        >
                            <Globe className="h-4 w-4 mr-2" />
                            Online Store
                        </button>
                        <button
                            onClick={() => setStoreType('physical')}
                            className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${
                                storeType === 'physical' ? 'bg-white text-espresso shadow-sm' : 'text-gray-500 hover:text-espresso'
                            }`}
                        >
                            <MapPin className="h-4 w-4 mr-2" />
                            Physical Store
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {storeType === 'online' ? (
                            // Online Form
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Link</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="url" 
                                            required
                                            placeholder="https://shopee.ph/..."
                                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                            value={formData.productUrl}
                                            onChange={(e) => setFormData({...formData, productUrl: e.target.value})}
                                        />
                                        <button 
                                            type="button"
                                            onClick={handleFetchPrice}
                                            disabled={isProcessing || !formData.productUrl}
                                            className="bg-white text-espresso border border-gray-200 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50 flex items-center transition-colors"
                                            title="Update Price Only"
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleAutoFetch}
                                            disabled={isProcessing || !formData.productUrl}
                                            className="bg-espresso text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-espresso/90 disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Auto-Fetch"}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Enter URL to automatically populate details.</p>
                                </div>

                                {isFetched && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        {!editingId && (
                                            <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex items-start gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-bold text-green-800">Data Extracted Successfully</p>
                                                    <p className="text-xs text-green-600">Review the details below before adding.</p>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label>
                                            <input 
                                                type="text" 
                                                value={formData.name} 
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                            />
                                        </div>
                                        
                                        {renderImageUploadSection()}
                                        {renderRatingInputs()}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (PHP) / Range</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. 5000 or 5000-9000"
                                                    value={formData.price} 
                                                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none" 
                                                />
                                                <p className="text-[10px] text-gray-400 mt-0.5">Enter a single price or a range (e.g. 5000-9000)</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock Status</label>
                                                <div className="flex items-center space-x-2 mt-2">
                                                    <label className="flex items-center cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            checked={formData.inStock} 
                                                            onChange={() => setFormData({...formData, inStock: true})}
                                                            className="mr-2 text-accent focus:ring-accent"
                                                        />
                                                        <span className="text-xs text-gray-700">In Stock</span>
                                                    </label>
                                                    <label className="flex items-center cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            checked={!formData.inStock} 
                                                            onChange={() => setFormData({...formData, inStock: false})}
                                                            className="mr-2 text-accent focus:ring-accent"
                                                        />
                                                        <span className="text-xs text-gray-700">Out</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Store Name</label>
                                            <input 
                                                type="text" 
                                                value={formData.store} 
                                                onChange={(e) => setFormData({...formData, store: e.target.value})}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                            <select 
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                                value={formData.category}
                                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            >
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>

                                        <button 
                                            type="submit" 
                                            className={`w-full font-bold py-3 rounded-xl transition-colors shadow-md text-white ${editingId ? 'bg-accent hover:bg-accent-hover' : 'bg-accent hover:bg-accent-hover'}`}
                                        >
                                            {editingId ? 'Update Product' : 'Add Online Product'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Physical Form
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Product Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" required 
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Store Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" required placeholder="e.g., PC Express"
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                        value={formData.store}
                                        onChange={(e) => setFormData({...formData, store: e.target.value})}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center">
                                        <MapPin className="h-3 w-3 mr-1 text-accent" />
                                        Store Address / Map Link <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="e.g., https://maps.app.goo.gl/abc or 'SM Megamall, 4th Floor'"
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                            value={formData.location}
                                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        />
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1 text-gray-400" />
                                        Paste a Google Maps link or enter the specific address.
                                    </p>
                                </div>

                                {renderRatingInputs()}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (PHP) / Range <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" required
                                            placeholder="e.g. 5000 or 5000-9000"
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                            value={formData.price}
                                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                        <select 
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                            value={formData.category}
                                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        >
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description <span className="text-red-500">*</span></label>
                                    <textarea 
                                        required rows={3}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Specifications (JSON Format - Auto-filled by AI)</label>
                                    <textarea 
                                        readOnly
                                        rows={3}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none font-mono text-xs cursor-text"
                                        value={formData.specs ? JSON.stringify(formData.specs, null, 2) : ''}
                                        placeholder='{"Brand": "AMD", "Cores": "6"}'
                                    />
                                </div>

                                {renderImageUploadSection()}

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product State</label>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="stock" 
                                                checked={formData.inStock} 
                                                onChange={() => setFormData({...formData, inStock: true})}
                                                className="mr-2 text-accent focus:ring-accent"
                                            />
                                            <span className="text-sm text-gray-700">In Stock</span>
                                        </label>
                                        <label className="flex items-center cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="stock" 
                                                checked={!formData.inStock} 
                                                onChange={() => setFormData({...formData, inStock: false})}
                                                className="mr-2 text-accent focus:ring-accent"
                                            />
                                            <span className="text-sm text-gray-700">Out of Stock</span>
                                        </label>
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-espresso hover:bg-espresso/90 text-white font-bold py-3 rounded-xl transition-colors shadow-md">
                                    {editingId ? 'Update Product' : 'Add Physical Product'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
              </div>
            </div>

            {/* Product List */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-espresso">Inventory Management</h2>
                            <p className="text-sm text-gray-500">Showing <span className="font-bold text-espresso">{filteredInventory.length}</span> filtered products</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Search inventory..."
                                    value={inventorySearchTerm}
                                    onChange={(e) => setInventorySearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none w-full md:w-64 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <select 
                                    value={inventorySortBy}
                                    onChange={(e) => setInventorySortBy(e.target.value as typeof inventorySortBy)}
                                    className="appearance-none pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none w-full md:w-48 transition-all cursor-pointer font-medium"
                                >
                                    <option value="newest">Sort: Newest First</option>
                                    <option value="price-asc">Sort: Price (Low to High)</option>
                                    <option value="price-desc">Sort: Price (High to Low)</option>
                                    <option value="techsprint">Sort: TechSprint Rating</option>
                                    <option value="rating">Sort: Average Store Rating</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[800px] overflow-y-auto">
                        {filteredInventory.length > 0 ? filteredInventory.map(product => (
                            <div key={product.id} className={`p-4 flex items-center justify-between transition-colors ${editingId === product.id ? 'bg-accent/5' : 'hover:bg-gray-50'}`}>
                                <div className="flex items-center space-x-4">
                                    <img src={product.imageUrl || DEFAULT_PRODUCT_IMAGE} alt={product.name} className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h3 className="font-bold text-espresso text-sm">{product.name}</h3>
                                            {!product.inStock && (
                                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                                    <AlertCircle className="h-2.5 w-2.5" /> STOCK OUT
                                                </span>
                                            )}
                                            {product.isOnline ? (
                                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">ONLINE</span>
                                            ) : (
                                                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded">PHYSICAL</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">{product.store}</p>
                                        <div className="flex items-center space-x-3 text-xs">
                                            <span className="font-semibold text-espresso">
                                                {product.priceRange ? `₱${product.priceRange}` : `₱${product.price.toLocaleString()}`}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {product.techSprintRating ? (
                                                    <span className="flex items-center text-accent font-bold">
                                                        <Zap className="h-3 w-3 mr-0.5 fill-current" /> {product.techSprintRating}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button 
                                        onClick={() => handleEditClick(product)}
                                        className={`p-2 rounded-full transition-all ${editingId === product.id ? 'bg-accent text-white' : 'text-gray-400 hover:text-accent hover:bg-accent/10'}`}
                                        title="Edit Product"
                                    >
                                        <Pencil className="h-5 w-5" />
                                    </button>
                                    <button 
                                        onClick={() => setProductToDelete(product)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                        title="Delete Product"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        )) : (
                          <div className="p-8 text-center text-gray-400">
                            <p>No products in inventory.</p>
                          </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                      <h2 className="text-2xl font-bold text-espresso">Market Performance Insights</h2>
                      <p className="text-gray-500 max-w-md">Comprehensive analysis of current product inventory and market trends.</p>
                  </div>
                  <div className="flex gap-4">
                      <div className="px-6 py-4 bg-accent/5 border border-accent/10 rounded-2xl flex items-center gap-4">
                         <div className="bg-accent rounded-xl p-2">
                             <TrendingUp className="h-6 w-6 text-white" />
                         </div>
                         <div>
                             <span className="block text-xl font-bold text-espresso">₱{Math.round(products.reduce((acc, p) => acc + p.price, 0) / (products.length || 1)).toLocaleString()}</span>
                             <span className="text-[10px] text-gray-400 uppercase font-black">Average Listing</span>
                         </div>
                      </div>
                      <div className="px-6 py-4 bg-espresso/5 border border-espresso/10 rounded-2xl flex items-center gap-4 text-espresso">
                         <div className="bg-espresso rounded-xl p-2">
                             <Package className="h-6 w-6 text-white" />
                         </div>
                         <div>
                             <span className="block text-xl font-bold">{products.length}</span>
                             <span className="text-[10px] text-gray-400 uppercase font-black">Active Units</span>
                         </div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Category Distribution Chart */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="text-lg font-bold text-espresso mb-6 flex items-center gap-2">
                          <PieChartIcon className="h-5 w-5 text-accent" />
                          Category Saturation
                      </h3>
                      <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={categoryChartData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                      label
                                  >
                                      {['#2C3E50', '#8E44AD', '#2980B9', '#27AE60', '#F39C12', '#C0392B'].map((color, index) => (
                                          <Cell key={`cell-${index}`} fill={color} />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Price Breakdown by Category */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="text-lg font-bold text-espresso mb-6 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-accent" />
                          Mean Price Per Sector
                      </h3>
                      <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={priceChartData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                  <YAxis axisLine={false} tickLine={false} />
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Average Price']}
                                  />
                                  <Bar dataKey="avg" fill="#8E44AD" radius={[4, 4, 0, 0]} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Rating Sentiment */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm lg:col-span-2">
                       <div className="flex items-center justify-between mb-6">
                           <h3 className="text-lg font-bold text-espresso">Global Review Sentiment</h3>
                           <button 
                               onClick={handleAnalyzeGlobalSentiment}
                               disabled={isAnalyzingSentiment}
                               className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                           >
                               {isAnalyzingSentiment ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                               Refresh AI Summary
                           </button>
                       </div>
                       
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                           <div className="lg:col-span-1 h-64">
                               <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={reviewDistributionData} layout="vertical">
                                       <XAxis type="number" hide />
                                       <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={70} />
                                       <Tooltip cursor={{ fill: 'transparent' }} />
                                       <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                           {reviewDistributionData.map((entry, index) => (
                                               <Cell key={`cell-${index}`} fill={entry.color} />
                                           ))}
                                       </Bar>
                                   </BarChart>
                               </ResponsiveContainer>
                           </div>
                           
                           <div className="lg:col-span-2 space-y-4">
                               <div className="bg-accent/5 border border-accent/10 p-6 rounded-2xl relative">
                                   <div className="absolute top-4 right-4 bg-white/50 p-1.5 rounded-lg border border-accent/20">
                                       <Zap className="h-4 w-4 text-accent fill-accent" />
                                   </div>
                                   <h4 className="text-xs font-black text-accent uppercase tracking-widest mb-2">AI Feedback Summary</h4>
                                   {isAnalyzingSentiment ? (
                                       <div className="space-y-2 animate-pulse">
                                           <div className="h-4 bg-accent/10 rounded w-full"></div>
                                           <div className="h-4 bg-accent/10 rounded w-5/6"></div>
                                           <div className="h-4 bg-accent/10 rounded w-4/6"></div>
                                       </div>
                                   ) : (
                                       <p className="text-sm text-espresso leading-relaxed italic">
                                           "{aiSentimentSummary || 'Start gathering more reviews to generate a sentiment summary.'}"
                                       </p>
                                   )}
                               </div>
                               
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Reviews</p>
                                        <p className="text-xl font-bold text-espresso">
                                            {products.reduce((acc, p) => acc + (p.userReviews?.length || 0), 0)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Average Satisfaction</p>
                                        <p className="text-xl font-bold text-accent">
                                            {(products.reduce((acc, p) => acc + (p.techSprintRating || 0), 0) / (products.length || 1)).toFixed(1)} / 5.0
                                        </p>
                                    </div>
                               </div>
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'broadcasts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Form Side */}
              <div className="lg:col-span-1">
                  <div className={`bg-white rounded-2xl shadow-sm border ${editingAnnouncementId ? 'border-accent ring-1 ring-accent' : 'border-gray-100'} overflow-hidden sticky top-24`}>
                      <div className={`${editingAnnouncementId ? 'bg-accent' : 'bg-blue-600'} p-4 text-white flex items-center justify-between`}>
                          <span className="font-bold flex items-center">
                              {editingAnnouncementId ? <Pencil className="h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                              {editingAnnouncementId ? 'Edit Announcement' : 'Post Announcement'}
                          </span>
                          {editingAnnouncementId && (
                              <button onClick={handleCancelAnnouncementEdit} className="text-xs bg-white/20 px-2 py-1 rounded">
                                  Cancel
                              </button>
                          )}
                      </div>
                      <div className="p-6">
                          <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                                  <input 
                                      type="text" required
                                      placeholder="e.g., Scheduled Maintenance"
                                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
                                      value={announcementFormData.title || ''}
                                      onChange={(e) => setAnnouncementFormData({...announcementFormData, title: e.target.value})}
                                  />
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Content</label>
                                  <textarea 
                                      required rows={5}
                                      placeholder="Details of the update..."
                                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
                                      value={announcementFormData.content || ''}
                                      onChange={(e) => setAnnouncementFormData({...announcementFormData, content: e.target.value})}
                                  />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                      <select 
                                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                                          value={announcementFormData.type}
                                          onChange={(e) => setAnnouncementFormData({...announcementFormData, type: e.target.value as Announcement['type']})}
                                      >
                                          <option value="info">Info</option>
                                          <option value="maintenance">Maintenance</option>
                                          <option value="update">Update</option>
                                          <option value="event">Event</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                                      <select 
                                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                                          value={announcementFormData.priority}
                                          onChange={(e) => setAnnouncementFormData({...announcementFormData, priority: e.target.value as Announcement['priority']})}
                                      >
                                          <option value="low">Low</option>
                                          <option value="medium">Medium</option>
                                          <option value="high">High</option>
                                      </select>
                                  </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                  <input 
                                      type="checkbox" 
                                      id="active"
                                      checked={announcementFormData.active}
                                      onChange={(e) => setAnnouncementFormData({...announcementFormData, active: e.target.checked})}
                                      className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent"
                                  />
                                  <label htmlFor="active" className="text-sm text-gray-700 font-medium">Visible to Users</label>
                              </div>

                              {!editingAnnouncementId && (
                                <div className="flex items-center space-x-2 pb-2">
                                  <input 
                                      type="checkbox" 
                                      id="notify"
                                      checked={announcementFormData.sendEmailNotification}
                                      onChange={async (e) => {
                                          const checked = e.target.checked;
                                          if (checked && !EmailService.hasToken()) {
                                              const token = await EmailService.getGmailToken();
                                              if (!token) {
                                                  setIsGmailAuthorized(false);
                                                  return;
                                              }
                                              setIsGmailAuthorized(true);
                                          }
                                          setAnnouncementFormData({...announcementFormData, sendEmailNotification: checked});
                                      }}
                                      className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent"
                                  />
                                  <label htmlFor="notify" className="text-sm text-gray-700 font-medium flex items-center gap-2">
                                      Broadcast to all active users via email
                                      {announcementFormData.sendEmailNotification && (
                                          isGmailAuthorized || EmailService.hasToken() ? (
                                              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Authorized</span>
                                          ) : (
                                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">Awaiting Auth</span>
                                          )
                                      )}
                                  </label>
                                </div>
                              )}

                              <button 
                                  type="submit" 
                                  disabled={isAnnouncementProcessing}
                                  className="w-full bg-espresso text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center"
                              >
                                  {isAnnouncementProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : (editingAnnouncementId ? 'Update' : 'Publish')}
                              </button>
                          </form>
                      </div>
                  </div>
              </div>

              {/* List Side */}
              <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                          <div>
                              <h2 className="text-xl font-bold text-espresso">Live Announcements</h2>
                              <p className="text-sm text-gray-500">History of site-wide broadcasts</p>
                          </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                          {announcements.length > 0 ? announcements.map(ann => (
                              <div key={ann.id} className="p-6 hover:bg-gray-50 flex items-start justify-between">
                                  <div className="flex items-start gap-4">
                                      <div className={`mt-1 p-2 rounded-lg ${
                                          ann.type === 'maintenance' ? 'bg-red-50 text-red-500' :
                                          ann.type === 'update' ? 'bg-blue-50 text-blue-500' :
                                          'bg-gray-50 text-gray-500'
                                      }`}>
                                          <Megaphone className="h-5 w-5" />
                                      </div>
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                              <h3 className="font-bold text-espresso">{ann.title}</h3>
                                              {!ann.active && <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-bold">HIDDEN</span>}
                                              {ann.priority === 'high' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">HIGH PRIORITY</span>}
                                          </div>
                                          <p className="text-sm text-gray-500 line-clamp-2 mb-2">{ann.content}</p>
                                          <div className="flex items-center text-xs text-gray-400">
                                              <Calendar className="h-3 w-3 mr-1" />
                                              {new Date(ann.date).toLocaleDateString()}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                      <button 
                                          onClick={() => handleEditAnnouncement(ann)}
                                          className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-full"
                                      >
                                          <Pencil className="h-4 w-4" />
                                      </button>
                                      <button 
                                          onClick={() => setAnnouncementToDelete(ann)}
                                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                      >
                                          <Trash2 className="h-4 w-4" />
                                      </button>
                                  </div>
                              </div>
                          )) : (
                              <div className="p-12 text-center">
                                  <Bell className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                  <p className="text-gray-400">No announcements yet.</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      
      {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in duration-300">
              {/* Profile Card */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm max-w-2xl mx-auto">
                  <div className="flex items-center gap-4 mb-6">
                      <div className="relative">
                          <img src={adminAvatar || currentUser?.avatarUrl} className="w-16 h-16 rounded-full object-cover border-2 border-accent/20" alt="Admin" />
                          <div className="absolute -bottom-1 -right-1 bg-accent text-white p-1 rounded-full border-2 border-white">
                              <Shield className="h-3 w-3" />
                          </div>
                      </div>
                      <div>
                          <h2 className="text-xl font-bold text-espresso">Admin Profile</h2>
                          <p className="text-sm text-gray-500">Update your public identity on TechSprint</p>
                      </div>
                  </div>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Display Name</label>
                          <input 
                              type="text" 
                              value={adminUsername}
                              onChange={(e) => setAdminUsername(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent transition-all"
                              placeholder="Admin Name"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Avatar URL</label>
                          <div className="flex flex-col sm:flex-row gap-3">
                              <input 
                                  type="text" 
                                  value={adminAvatar}
                                  onChange={(e) => setAdminAvatar(e.target.value)}
                                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent transition-all"
                                  placeholder="https://..."
                              />
                              <button 
                                  onClick={handleUpdateAdminProfile}
                                  disabled={isUpdatingProfile}
                                  className="px-8 py-3 bg-espresso text-white rounded-xl font-bold text-sm hover:bg-accent transition-all flex items-center justify-center shadow-md hover:shadow-accent/20"
                              >
                                  {isUpdatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center max-w-2xl mx-auto">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings className="h-8 w-8 text-gray-500" />
                  </div>
                  <h2 className="text-xl font-bold text-espresso mb-2">Maintenance & Controls</h2>
                  <p className="text-gray-500 mb-6">Manage API connections, clearing caches, and system-wide thresholds.</p>
                  <button className="px-6 py-2 border border-gray-200 rounded-xl text-gray-400 font-bold text-sm cursor-not-allowed">
                      System Diagnostics (Coming Soon)
                  </button>
              </div>
          </div>
      )}


      {/* Delete Confirmation Dialog */}
      {productToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/60 backdrop-blur-sm" onClick={() => setProductToDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
             <button 
                onClick={() => setProductToDelete(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-espresso transition-colors"
             >
                <X className="h-5 w-5" />
             </button>
             
             <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                   <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-espresso mb-2">Delete Product?</h3>
                <p className="text-gray-500 mb-6">
                   Are you sure you want to delete <span className="font-bold text-espresso">"{productToDelete.name}"</span>? This action cannot be undone.
                </p>
                
                <div className="flex w-full gap-3">
                   <button 
                      onClick={() => setProductToDelete(null)}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                   >
                      Cancel
                   </button>
                   <button 
                      onClick={handleConfirmDelete}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200"
                   >
                      Delete
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Announcement Delete Confirmation */}
      {announcementToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/60 backdrop-blur-sm" onClick={() => setAnnouncementToDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
             <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                   <Trash2 className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-espresso mb-2">Delete Announcement?</h3>
                <p className="text-gray-500 mb-6">
                   Are you sure you want to delete <span className="font-bold text-espresso">"{announcementToDelete.title}"</span>?
                </p>
                <div className="flex w-full gap-3">
                   <button 
                      onClick={() => setAnnouncementToDelete(null)}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors"
                   >
                      Cancel
                   </button>
                   <button 
                      onClick={handleConfirmDeleteAnnouncement}
                      className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl transition-colors"
                   >
                      Delete
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
