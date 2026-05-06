
import React, { useState, useEffect, useRef } from 'react';
import { User, Product } from '../types';
import { Heart, Bell, Star, Settings, Camera, X, Lock, Trash2, AlertTriangle, MessageCircle, CheckCircle, Shield, Tag, Pencil, Save, Upload, BellRing, Mail, RefreshCw, User as UserIcon } from 'lucide-react';
import { dbService } from '../services/dbService';
import { AuthService } from '../services/authService';
import { auth } from '../firebase';
import { DEFAULT_PRODUCT_IMAGE } from '../constants';
import ProductCard from '../components/ProductCard';

interface ProfileProps {
  user: User | null;
  products?: Product[];
  savedIds?: (number | string)[];
  alertIds?: (number | string)[];
  stockAlertIds?: string[];
  notifications?: { id: string; type: string; message: string; date: string; read: boolean }[];
  onMarkNotificationRead?: (id: string) => void;
  onDeleteNotification?: (id: string) => void;
  onToggleSave?: (id: number | string) => void;
  onToggleAlert?: (id: number | string) => void;
  onToggleStockAlert?: (id: number | string) => void;
  // Review Handlers
  onEditReview?: (productId: number | string, reviewId: number | string, comment: string, rating: number) => void;
  onDeleteReview?: (productId: number | string, reviewId: number | string) => void;
}

const Profile: React.FC<ProfileProps> = ({ 
  user, 
  products = [], 
  savedIds = [], 
  alertIds = [],
  stockAlertIds = [],
  notifications = [],
  onMarkNotificationRead = () => {},
  onDeleteNotification = () => {},
  onToggleSave = () => {},
  onToggleAlert = () => {},
  onToggleStockAlert = () => {},
  onEditReview,
  onDeleteReview
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'alerts' | 'notifications' | 'reviews' | 'settings' | 'admin_overview'>('saved');
  const [isEditing, setIsEditing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit Profile State
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showReauthPrompt, setShowReauthPrompt] = useState(false);
  const [pendingEmailUpdate, setPendingEmailUpdate] = useState('');
  const [pendingPasswordUpdate, setPendingPasswordUpdate] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const startEditing = () => {
    if (user) {
      setAvatarUrl(user.avatarUrl);
      setNewUsername(user.username);
      setIsEditing(true);
      setMessage('');
    }
  };

  useEffect(() => {
    if (user && auth.currentUser && auth.currentUser.emailVerified && auth.currentUser.email && auth.currentUser.email !== user.email && !user.email.endsWith('@techsprint.com')) {
       // Auto-sync if email is verified and different
       dbService.syncUserEmail(user.uid, user.username, auth.currentUser.email);
    }
  }, [user]); 

  // Review Management State
  const [editingReview, setEditingReview] = useState<{ id: number | string; productId: number | string; comment: string; rating: number } | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<{ id: number | string; productId: number | string } | null>(null);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    );
  }

  // Filter Data
  const savedProducts = products.filter(p => savedIds.map(String).includes(p.id.toString()));
  const alertProducts = products.filter(p => alertIds.map(String).includes(p.id.toString()));
  const stockAlertProducts = products.filter(p => stockAlertIds.map(String).includes(p.id.toString()));
  const userReviews = products.flatMap(p => 
    (p.userReviews || [])
    .filter(r => r.userId === user.uid || r.user === user.username)
    .map(r => ({ ...r, product: p }))
  );

  const handleSaveProfile = async () => {
    setMessage('');
    if (newPassword && newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    try {
        // Handle sensitive updates first (if any)
        if (newPassword) {
            const authResult = await AuthService.updatePassword(newPassword);
            if (authResult === 'REAUTH_REQUIRED') {
              setShowReauthPrompt(true);
              setPendingPasswordUpdate(newPassword);
              setIsLoading(false);
              return;
            } else if (typeof authResult === 'string') {
              setMessage(authResult);
              setIsLoading(false);
              return;
            }
        }

        // Use the new updateProfile method for username and avatar
        const profileResult = await AuthService.updateProfile(user.uid, {
            username: newUsername !== user.username ? newUsername : undefined,
            avatarUrl: avatarUrl !== user.avatarUrl ? avatarUrl : undefined
        });

        if (typeof profileResult === 'string') {
            setMessage(profileResult);
            setIsLoading(false);
            return;
        }

        if (newPassword) {
            // Also notify DB of password if it's stored there (legacy)
            await dbService.updateUser(user.uid, { password: newPassword });
            setMessage('Profile and password updated successfully. For security, you will be signed out.');
            setTimeout(async () => {
                await AuthService.logout();
                window.location.href = '/';
            }, 2000);
            return;
        }

        setMessage('Profile updated successfully.');
        setIsEditing(false);
        
        setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
        setMessage('Failed to update profile.');
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === user.email) return;
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await AuthService.updateEmailAddress(newEmail);
      if (result === true) {
        setMessage('A verification email has been sent to your new address. You will be signed out now. Please verify it to complete the update.');
        setNewEmail('');
        setTimeout(async () => {
          await AuthService.logout();
          window.location.href = '/';
        }, 3000);
      } else if (result === 'REAUTH_REQUIRED') {
        setShowReauthPrompt(true);
        setPendingEmailUpdate(newEmail);
      } else if (typeof result === 'string') {
        setMessage(result);
      }
    } catch (err) {
      setMessage('An error occurred during email update.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReauthenticate = async () => {
    const isGoogleOnly = auth.currentUser?.providerData.some(p => p.providerId === 'google.com') && 
                         !auth.currentUser?.providerData.some(p => p.providerId === 'password');

    if (!isGoogleOnly && !currentPassword) {
      setMessage('Please enter your password.');
      return;
    }
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await AuthService.reauthenticate(currentPassword);
      if (result === true) {
        setShowReauthPrompt(false);
        setCurrentPassword('');
        // Retry the email update
        if (pendingEmailUpdate) {
            const updateResult = await AuthService.updateEmailAddress(pendingEmailUpdate);
            if (updateResult === true) {
              setMessage('Identity verified. A verification email has been sent to your new address. You will be signed out now.');
              setNewEmail('');
              setPendingEmailUpdate('');
              setTimeout(async () => {
                await AuthService.logout();
                window.location.href = '/';
              }, 3000);
            } else if (updateResult === 'REAUTH_REQUIRED') {
              setMessage('Security check required. Please try again.');
            } else if (typeof updateResult === 'string') {
              setMessage(updateResult);
            }
        }

        // Retry the password update
        if (pendingPasswordUpdate) {
            const updateResult = await AuthService.updatePassword(pendingPasswordUpdate);
            if (updateResult === true) {
              await dbService.updateUser(user.uid, { password: pendingPasswordUpdate });
              setMessage('Identity verified. Password updated successfully. You will be signed out now.');
              setNewPassword('');
              setConfirmPassword('');
              setPendingPasswordUpdate('');
              setTimeout(async () => {
                await AuthService.logout();
                window.location.href = '/';
              }, 2000);
            } else if (updateResult === 'REAUTH_REQUIRED') {
              setMessage('Security check required. Please try again.');
            } else if (typeof updateResult === 'string') {
              setMessage(updateResult);
            }
        }
      } else if (typeof result === 'string') {
        setMessage(result);
      }
    } catch (err) {
      setMessage('Re-authentication failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const syncEmailNow = async () => {
    if (auth.currentUser && auth.currentUser.emailVerified && auth.currentUser.email && auth.currentUser.email !== user.email) {
      setIsLoading(true);
      try {
        await dbService.syncUserEmail(user.uid, user.username, auth.currentUser.email);
        setMessage('Email synced successfully.');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setMessage('Failed to sync email.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Increased limit for raw file but we compress anyway
          setMessage('Image too large (max 5MB)');
          return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions (e.g., 400x400)
          const MAX_SIZE = 400;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress as JPEG with 0.7 quality
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setAvatarUrl(compressedDataUrl);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmDeleteReview = () => {
    if (reviewToDelete && onDeleteReview) {
      onDeleteReview(reviewToDelete.productId, reviewToDelete.id);
      setReviewToDelete(null);
    }
  };

  const saveReviewEdit = () => {
    if (editingReview && onEditReview) {
      onEditReview(editingReview.productId, editingReview.id, editingReview.comment, editingReview.rating);
      setEditingReview(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar / Profile Card */}
        <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                {/* Header Background */}
                <div className="h-32 bg-espresso relative">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
                    {user.isAdmin && (
                        <div className="absolute top-4 right-4 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 shadow-sm">
                            ADMINISTRATOR
                        </div>
                    )}
                </div>

                <div className="px-8 pb-8 text-center relative">
                    {/* Avatar */}
                    <div className="relative -mt-16 mb-4 inline-block group">
                        <div 
                            className={`w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-cream relative ${isEditing ? 'cursor-pointer hover:opacity-90' : ''}`}
                            onClick={() => isEditing && fileInputRef.current?.click()}
                        >
                            <img 
                                src={isEditing ? avatarUrl : user.avatarUrl} 
                                alt={user.username} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.username}&background=random`;
                                }}
                            />
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white animate-in fade-in">
                                    <Camera className="h-6 w-6 mb-1" />
                                    <span className="text-[10px] font-bold uppercase">Upload</span>
                                </div>
                            )}
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept="image/*"
                        />
                    </div>

                    <h1 className="text-2xl font-bold text-espresso">{user.username}</h1>
                    <p className="text-gray-500 text-sm mb-6">Member since 2024</p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-6 mb-6">
                        <div className="text-center">
                            <span className="block font-bold text-xl text-espresso">{savedIds.length}</span>
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Saved</span>
                        </div>
                        <div className="text-center border-l border-r border-gray-100">
                            <span className="block font-bold text-xl text-espresso">{alertIds.length + (stockAlertIds?.length || 0)}</span>
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Alerts</span>
                        </div>
                        <div className="text-center">
                            <span className="block font-bold text-xl text-espresso">{userReviews.length}</span>
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Reviews</span>
                        </div>
                    </div>

                    {/* Edit Toggle */}
                    {!isEditing ? (
                        <button 
                            onClick={startEditing}
                            className="w-full py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <Settings className="h-4 w-4" /> Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-2">
                             <button 
                                onClick={() => {
                                    setIsEditing(false);
                                    setAvatarUrl(user.avatarUrl);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setMessage('');
                                }}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveProfile}
                                className="flex-1 py-2.5 bg-espresso text-white font-bold rounded-xl hover:bg-espresso/90 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <Save className="h-4 w-4" /> Save
                            </button>
                        </div>
                    )}
                    
                    {message && <p className={`text-xs mt-3 font-medium ${message.includes('Failed') || message.includes('match') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
                </div>

                {/* Edit Form */}
                {isEditing && (
                    <div className="px-8 pb-8 animate-in slide-in-from-top-2">
                        <div className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 font-mono tracking-tighter">Profile Image</label>
                                <div 
                                    className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-accent hover:bg-accent/5 transition-all cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <Upload className="h-6 w-6 text-gray-400 group-hover:text-accent" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 group-hover:text-espresso">Click to upload new avatar</span>
                                    <p className="text-[10px] text-gray-400 mt-1">Recommended: 400x400px, max 2MB</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 font-mono tracking-tighter">Username</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none font-medium transition-all"
                                        placeholder="Enter your username"
                                    />
                                </div>
                            </div>
                            {auth.currentUser?.providerData.some(p => p.providerId === 'password') && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input 
                                                type="password" 
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Leave blank to keep current"
                                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                            />
                                        </div>
                                    </div>
                                    {newPassword && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
                                            <input 
                                                type="password" 
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Main Content Tabs */}
        <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'admin_overview', label: 'Admin Overview', icon: Shield, adminOnly: true },
                        { id: 'saved', label: 'Saved', icon: Heart },
                        { id: 'alerts', label: 'Alerts', icon: Bell },
                        { id: 'notifications', label: 'Activity', icon: MessageCircle },
                        { id: 'reviews', label: 'Reviews', icon: Star },
                        { id: 'settings', label: 'Security', icon: Lock },
                    ].filter(tab => {
                        if (user.isAdmin) return !tab.userOnly || tab.id === 'admin_overview';
                        return !tab.adminOnly;
                    }).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'saved' | 'alerts' | 'notifications' | 'reviews' | 'settings' | 'admin_overview')}
                            className={`flex-1 min-w-[120px] py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                                activeTab === tab.id 
                                    ? 'border-accent text-accent bg-accent/5' 
                                    : 'border-transparent text-gray-500 hover:text-espresso hover:bg-gray-50'
                            }`}
                        >
                            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'fill-accent' : ''}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 flex-1 bg-gray-50/30">
                    
                    {/* Admin Overview (Exclusive to Admins) */}
                    {activeTab === 'admin_overview' && user.isAdmin && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-espresso mb-4 flex items-center">
                                        <Tag className="h-4 w-4 mr-2 text-accent" /> Quick Inventory
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Total Products</span>
                                            <span className="font-bold text-espresso">{products.length}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">System Notifications</span>
                                            <span className="font-bold text-espresso">{notifications.length}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => window.location.href = '/?page=admin'} 
                                        className="w-full mt-6 py-2 bg-espresso text-white rounded-xl font-bold text-sm hover:bg-espresso/90 transition-colors"
                                    >
                                        Open Full Admin Panel
                                    </button>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-espresso mb-4 flex items-center">
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Administrative Tasks
                                    </h3>
                                    <ul className="text-sm space-y-3 text-gray-600">
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                            Update product price history
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                            Manage store branch mapping
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                            Audit community reviews
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Tab (Combined Profile Edit for better UX) */}
                    {activeTab === 'settings' && (
                        <div className="max-w-md mx-auto py-8 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-espresso mb-6 flex items-center">
                                    <Lock className="h-4 w-4 mr-2 text-gray-400" /> Security & Identity
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input 
                                                    type="email" 
                                                    value={newEmail || user.email}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    placeholder={user.email}
                                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleUpdateEmail}
                                                disabled={isLoading || !newEmail || newEmail === user.email}
                                                className="px-4 py-2 bg-espresso text-white text-xs font-bold rounded-lg hover:bg-espresso/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                                            >
                                                {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                Change
                                            </button>
                                        </div>
                                        {auth.currentUser && auth.currentUser.email !== user.email && auth.currentUser.emailVerified && (
                                            <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between animate-in fade-in">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                    <p className="text-[10px] text-blue-700 font-medium">New email verified! Ready to sync.</p>
                                                </div>
                                                <button 
                                                    onClick={syncEmailNow}
                                                    className="text-[10px] font-bold text-white bg-blue-500 px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                                                >
                                                    Sync Now
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                                        <input 
                                            type="password" 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Leave blank to keep current"
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                        />
                                    </div>
                                    {newPassword && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
                                            <input 
                                                type="password" 
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                                            />
                                        </div>
                                    )}
                                    <button 
                                        onClick={handleSaveProfile}
                                        className="w-full py-3 bg-espresso text-white font-bold rounded-xl hover:bg-espresso/90 transition-colors shadow-md"
                                    >
                                        Save Account Updates
                                    </button>
                                    {message && <p className={`text-xs text-center mt-2 font-medium ${message.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'saved' && (
                        savedProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {savedProducts.map(product => (
                                    <ProductCard 
                                        key={product.id}
                                        product={product}
                                        isSaved={true}
                                        onToggleSave={onToggleSave}
                                        hasAlert={alertIds.map(String).includes(product.id.toString())}
                                        onToggleAlert={onToggleAlert}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Heart className="h-12 w-12 mb-3 opacity-20" />
                                <p>No saved items yet.</p>
                            </div>
                        )
                    )}

                    {/* Alerts */}
                    {activeTab === 'alerts' && (
                        (alertProducts.length > 0 || stockAlertProducts.length > 0) ? (
                             <div className="space-y-4">
                                 {/* Price Alerts */}
                                 {alertProducts.map(product => (
                                     <div key={`price-${product.id}`} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm border-l-4 border-l-accent">
                                         <div className="flex items-center gap-4">
                                             <img src={product.imageUrl || DEFAULT_PRODUCT_IMAGE} alt={product.name} className="w-12 h-12 rounded-lg object-contain bg-gray-50" />
                                             <div>
                                                 <div className="flex items-center gap-2">
                                                     <h4 className="font-bold text-espresso text-sm line-clamp-1">{product.name}</h4>
                                                     <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Price Alert</span>
                                                 </div>
                                                 <p className="text-xs text-gray-500">Current Price: <span className="font-bold text-accent">₱{product.price.toLocaleString()}</span></p>
                                             </div>
                                         </div>
                                         <button 
                                             onClick={() => onToggleAlert(product.id.toString())}
                                             className="p-2 text-accent hover:bg-accent/10 rounded-full transition-colors"
                                             title="Remove Alert"
                                         >
                                             <Bell className="h-5 w-5 fill-accent" />
                                         </button>
                                     </div>
                                 ))}
                                 
                                 {/* Stock Alerts */}
                                 {stockAlertProducts.map(product => (
                                     <div key={`stock-${product.id}`} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm border-l-4 border-l-orange-400">
                                         <div className="flex items-center gap-4">
                                             <img src={product.imageUrl || DEFAULT_PRODUCT_IMAGE} alt={product.name} className="w-12 h-12 rounded-lg object-contain bg-gray-50" />
                                             <div>
                                                 <div className="flex items-center gap-2">
                                                     <h4 className="font-bold text-espresso text-sm line-clamp-1">{product.name}</h4>
                                                     <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Availability Request</span>
                                                 </div>
                                                 <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                     <AlertCircle className="h-3 w-3 text-orange-500" />
                                                     {product.inStock ? 'Now available!' : 'Still out of stock'}
                                                 </p>
                                             </div>
                                         </div>
                                         <button 
                                             onClick={() => onToggleStockAlert && onToggleStockAlert(product.id.toString())}
                                             className="p-2 text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                                             title="Cancel Notification"
                                         >
                                             <BellRing className="h-5 w-5 fill-orange-500" />
                                         </button>
                                     </div>
                                 ))}
                             </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                 <Bell className="h-12 w-12 mb-3 opacity-20" />
                                 <p>No active price or stock alerts.</p>
                             </div>
                        )
                    )}

                    {/* Notifications */}
                    {activeTab === 'notifications' && (
                        notifications.length > 0 ? (
                            <div className="space-y-4">
                                {notifications.map(note => (
                                    <div 
                                        key={note.id} 
                                        className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${
                                            note.read ? 'bg-white border-gray-100 opacity-75' : 'bg-white border-accent/20 shadow-md ring-1 ring-accent/10'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${note.read ? 'bg-gray-100' : 'bg-accent/10'}`}>
                                            <Bell className={`h-5 w-5 ${note.read ? 'text-gray-400' : 'text-accent'}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm font-bold ${note.read ? 'text-gray-500' : 'text-espresso'}`}>
                                                    {note.type === 'price_change' ? 'Price Update' : 'Activity'}
                                                </h4>
                                                <span className="text-[10px] text-gray-400">{new Date(note.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className={`text-sm mt-1 ${note.read ? 'text-gray-400' : 'text-gray-600'}`}>{note.message}</p>
                                            
                                            <div className="mt-3 flex gap-2">
                                                {!note.read && (
                                                    <button 
                                                        onClick={() => onMarkNotificationRead(note.id)}
                                                        className="text-[10px] font-bold text-accent px-2 py-1 rounded bg-accent/5 hover:bg-accent/10 transition-colors flex items-center gap-1"
                                                    >
                                                        <CheckCircle className="h-3 w-3" /> Mark as Read
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => onDeleteNotification(note.id)}
                                                    className="text-[10px] font-bold text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                                                >
                                                    <Trash2 className="h-3 w-3" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Bell className="h-12 w-12 mb-3 opacity-10" />
                                <p>No notifications yet.</p>
                            </div>
                        )
                    )}

                    {/* Reviews */}
                    {activeTab === 'reviews' && (
                        userReviews.length > 0 ? (
                            <div className="space-y-6">
                                {userReviews.map((review, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm group relative hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={review.product.imageUrl || DEFAULT_PRODUCT_IMAGE} 
                                                    alt={review.product.name} 
                                                    className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100" 
                                                />
                                                <div>
                                                    <h4 className="font-bold text-espresso text-sm">{review.product.name}</h4>
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                                        ))}
                                                        <span className="text-xs text-gray-400 ml-2">{review.date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Edit/Delete Buttons (Appear on hover) */}
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => setEditingReview({
                                                        id: review.id,
                                                        productId: review.product.id,
                                                        comment: review.comment,
                                                        rating: review.rating
                                                    })}
                                                    className="p-2 text-gray-400 hover:text-accent hover:bg-accent/5 rounded-full transition-colors"
                                                    title="Edit Review"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setReviewToDelete({ id: review.id, productId: review.product.id })}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Delete Review"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-sm italic bg-gray-50 p-3 rounded-lg">"{review.comment}"</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Star className="h-12 w-12 mb-3 opacity-20" />
                                <p>You haven't reviewed any products yet.</p>
                            </div>
                        )
                    )}

                    {/* Support / Ask TechSprint */}
                </div>
            </div>
        </div>
      </div>

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-espresso/60 backdrop-blur-sm" onClick={() => setEditingReview(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-espresso">Edit Review</h3>
                    <button onClick={() => setEditingReview(null)} className="text-gray-400 hover:text-espresso">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="flex items-center space-x-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                            key={star}
                            onClick={() => setEditingReview({...editingReview, rating: star})}
                            className="focus:outline-none transition-transform hover:scale-110"
                        >
                            <Star 
                                className={`h-6 w-6 ${star <= editingReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                        </button>
                    ))}
                </div>

                <textarea
                    value={editingReview.comment}
                    onChange={(e) => setEditingReview({...editingReview, comment: e.target.value})}
                    className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-accent outline-none resize-none h-32 bg-gray-50 mb-4"
                    placeholder="Update your review..."
                />

                <div className="flex gap-3">
                    <button 
                        onClick={() => setEditingReview(null)}
                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={saveReviewEdit}
                        disabled={!editingReview.comment.trim()}
                        className="flex-1 py-2.5 bg-espresso text-white font-bold rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Review Confirmation */}
      {reviewToDelete && (
         <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-espresso/60 backdrop-blur-sm" onClick={() => setReviewToDelete(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="font-bold text-lg text-espresso mb-2">Delete Review?</h3>
                <p className="text-sm text-gray-500 mb-6">Are you sure you want to remove this review? This action cannot be undone.</p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setReviewToDelete(null)}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDeleteReview}
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
         </div>
      )}

      {/* Re-authentication Modal */}
      {showReauthPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/60 backdrop-blur-sm" onClick={() => setShowReauthPrompt(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-espresso">Identity Verification</h3>
              <p className="text-sm text-gray-500 mt-2">
                {auth.currentUser?.providerData.some(p => p.providerId === 'google.com') && !auth.currentUser?.providerData.some(p => p.providerId === 'password')
                  ? "To update your email, please confirm your identity by signing in with Google again."
                  : "To update your email, please confirm your current password."}
              </p>
            </div>

            <div className="space-y-4">
              {!(auth.currentUser?.providerData.some(p => p.providerId === 'google.com') && !auth.currentUser?.providerData.some(p => p.providerId === 'password')) && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                      placeholder="Enter current password"
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              {message && <p className="text-xs text-red-500 text-center font-medium">{message}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowReauthPrompt(false);
                    setCurrentPassword('');
                  }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReauthenticate}
                  disabled={isLoading || (!(auth.currentUser?.providerData.some(p => p.providerId === 'google.com') && !auth.currentUser?.providerData.some(p => p.providerId === 'password')) && !currentPassword)}
                  className="flex-1 py-3 bg-espresso text-white font-bold rounded-xl hover:bg-espresso/90 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {auth.currentUser?.providerData.some(p => p.providerId === 'google.com') && !auth.currentUser?.providerData.some(p => p.providerId === 'password') ? "Confirm with Google" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
