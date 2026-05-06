
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import Saved from './pages/Saved';
import About from './pages/About';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Terms from './pages/Terms';
import Announcements from './pages/Announcements';
import StoreLocator from './pages/StoreLocator';
import Help from './pages/Help';
import AIAssistant from './components/AIAssistant';
import LoginModal from './components/LoginModal';
import ComparisonBar from './components/ComparisonBar';
import ComparisonModal from './components/ComparisonModal';
import NotificationToast from './components/NotificationToast';
import ProductDetailModal from './components/ProductDetailModal';
import { PageView, Product, User, Notification, UserReview } from './types';
import { AuthService } from './services/authService';
import { dbService } from './services/dbService';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [savedIds, setSavedIds] = useState<(number | string)[]>([]);
  const [stockAlertIds, setStockAlertIds] = useState<string[]>([]);
  const [comparisonIds, setComparisonIds] = useState<(number | string)[]>([]);
  
  // State Management for Dynamic Products and Auth
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [isPrefsInitialized, setIsPrefsInitialized] = useState(false);

  // Comparison State
  const comparisonList = React.useMemo(() => {
    return products.filter(p => comparisonIds.map(String).includes(p.id.toString()));
  }, [products, comparisonIds]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // Alert & Notification State
  const [alertIds, setAlertIds] = useState<(number | string)[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([]);

  // Notification Helpers
  const addNotification = React.useCallback((title: string, message: string, type: 'info' | 'success' | 'alert' = 'info') => {
    const newNote: Notification = {
      id: Date.now() + Math.random(),
      title,
      message,
      type
    };
    setNotifications(prev => [newNote, ...prev]);
  }, []);

  const removeNotification = (id: number | string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Listen for persistent DB notifications
  useEffect(() => {
    if (currentUser) {
      let lastKnownDbIds: (string | number)[] = [];
      const unsubscribe = dbService.listenUserNotifications(currentUser.uid, (newNotifications) => {
        // Update local state sorted by date newest first
        const sorted = [...newNotifications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const newUnread = sorted.filter(n => !n.read && !lastKnownDbIds.includes(n.id));
        if (lastKnownDbIds.length > 0) { // Only toast if we already had a baseline
            newUnread.forEach(n => {
                if (!currentUser.isAdmin) {
                    addNotification('TechSprint Update', n.message, n.type === 'price_change' ? 'alert' : 'info');
                }
            });
        }
        
        lastKnownDbIds = sorted.map(n => n.id);
        
        setDbNotifications(sorted);
      });
      return () => unsubscribe();
    } else {
        setTimeout(() => {
            setDbNotifications(prev => prev.length > 0 ? [] : prev);
        }, 0);
    }
  }, [currentUser, addNotification]);

  // Global Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Initialize App Data
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      
      // 1. Init Auth (Check for admin seed)
      await AuthService.init();
      await dbService.testConnection();
      
      // 2. Load User Session
      const storedUser = AuthService.getCurrentUser();
      if (storedUser) {
        setCurrentUser(storedUser);
        // Load User Prefs from Firebase if logged in
        try {
          // Explicitly pass uid to avoid race conditions with auth.currentUser
          const prefs = await dbService.getUserPrefs(storedUser.uid);
          // Normalize IDs to strings
          setSavedIds(prefs.savedIds.map(id => id.toString()));
          setAlertIds(prefs.alertIds.map(id => id.toString()));
          setComparisonIds(prefs.comparisonIds.map(id => id.toString()));
          
          // Load Stock Alerts
          const stockAlerts = await dbService.getUserStockAlerts(storedUser.uid);
          setStockAlertIds(stockAlerts);
          
          setIsPrefsInitialized(true);
        } catch (error) {
          console.error("Failed to load user prefs", error);
          setIsPrefsInitialized(true); // Set true anyway to allow future saves
        }
      } else {
        // Fallback to local storage for guests (or clear if strict)
        const storedSaved = localStorage.getItem('techsprint_saved');
        if (storedSaved) setSavedIds(JSON.parse(storedSaved).map((id: string | number) => id.toString()));
        
        const storedAlerts = localStorage.getItem('techsprint_alerts');
        if (storedAlerts) setAlertIds(JSON.parse(storedAlerts).map((id: string | number) => id.toString()));

        const storedComparison = localStorage.getItem('techsprint_comparison');
        if (storedComparison) setComparisonIds(JSON.parse(storedComparison).map((id: string | number) => id.toString()));
        
        setIsPrefsInitialized(true);
      }

      // 3. Load Products from Firebase
      const dbProducts = await dbService.getAllProducts();

      setProducts(dbProducts);
      
      setLoading(false);
    };

    initApp();
  }, []);

  // Sync Prefs to DB and Local Storage when changed
  useEffect(() => {
    if (!isPrefsInitialized) return;

    // We only update local storage if it's not a logout clear-down.
    // If savedIds is empty but we haven't just cleared it for logout, it's fine.
    // However, to keep it simple and safe: we always persist to localStorage 
    // unless currentUser is transitioning to null but we still have account data in memory.
    
    // A robust way: if we are logged in, we sync to BOTH.
    // If we are logged out, we ONLY sync to localStorage.
    
    localStorage.setItem('techsprint_saved', JSON.stringify(savedIds));
    localStorage.setItem('techsprint_alerts', JSON.stringify(alertIds));
    localStorage.setItem('techsprint_comparison', JSON.stringify(comparisonIds));

    if (currentUser) {
      dbService.updateUserPrefs(savedIds, alertIds, comparisonIds, currentUser.uid);
    }
  }, [savedIds, alertIds, comparisonIds, currentUser, isPrefsInitialized]);

  const handleToggleSave = (id: number | string) => {
    const idStr = id.toString();
    setSavedIds(prev => {
        const prevStr = prev.map(pid => pid.toString());
        if (prevStr.includes(idStr)) {
            return prev.filter(pid => pid.toString() !== idStr);
        }
        return [...prev, idStr];
    });
  };

  const handleToggleAlert = (id: number | string) => {
    if (!currentUser) {
      addNotification('Sign In Required', 'Please sign in to set price alerts.', 'info');
      setIsLoginModalOpen(true);
      return;
    }
    const idStr = id.toString();
    const exists = alertIds.map(aid => aid.toString()).includes(idStr);
    
    setAlertIds(prev => exists ? prev.filter(aid => aid.toString() !== idStr) : [...prev, idStr]);
    
    if (!exists) {
      addNotification('Alert Set', 'We will notify you when the price drops.', 'success');
    } else {
      addNotification('Alert Removed', 'You will no longer receive notifications for this item.', 'info');
    }
  };

  const handleToggleStockAlert = async (id: number | string) => {
    if (!currentUser) {
      addNotification('Sign In Required', 'Please sign in to receive stock notifications.', 'info');
      setIsLoginModalOpen(true);
      return;
    }

    const idStr = id.toString();
    const exists = stockAlertIds.includes(idStr);
    
      if (exists) {
        setStockAlertIds(prev => prev.filter(sid => sid !== idStr));
        addNotification('Removed', 'Stock notification removed.', 'info');
        await dbService.toggleStockAlert(idStr, currentUser.uid, false);
      } else {
        setStockAlertIds(prev => [...prev, idStr]);
        addNotification('Request Received', "We'll notify you when this item is back in stock!", 'success');
        await dbService.toggleStockAlert(idStr, currentUser.uid, true);
      }
  };

  const handleAddProduct = async (newProduct: Product) => {
    // DB Update first to ensure we have it
    await dbService.addProduct(newProduct);
    setProducts(prev => [newProduct, ...prev]);
    addNotification('Success', 'Product added to inventory.', 'success');
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    // 1. Find the existing product to compare
    const existingProduct = products.find(p => p.id === updatedProduct.id);
    
    const finalProduct = { ...updatedProduct };

    // 2. Logic for Price History and Sales
    if (existingProduct && existingProduct.price !== updatedProduct.price) {
        // Create a history entry
        const historyEntry = {
            price: existingProduct.price,
            date: new Date().toISOString()
        };
        
        finalProduct.priceHistory = [
            ...(existingProduct.priceHistory || []),
            historyEntry
        ];

        // Sale Logic
        if (updatedProduct.price < existingProduct.price) {
            if (!existingProduct.originalPrice) {
                finalProduct.originalPrice = existingProduct.price;
            }
            // Removed local toast to prevent doubling with the DB listener
        } else {
            if (finalProduct.originalPrice && finalProduct.price >= finalProduct.originalPrice) {
                finalProduct.originalPrice = undefined;
            }
        }
    } else if (existingProduct) {
        finalProduct.priceHistory = existingProduct.priceHistory;
    }

    setProducts(prev => prev.map(p => p.id === finalProduct.id ? finalProduct : p));
    
    // Check alerts
    if (existingProduct) {
        // Price change notifications
        if (finalProduct.price !== existingProduct.price) {
            await dbService.createProductPriceNotification(
                finalProduct.id, 
                finalProduct.name, 
                existingProduct.price, 
                finalProduct.price,
                currentUser?.uid
            );
        }

        // Back in stock notifications
        if (!existingProduct.inStock && finalProduct.inStock) {
            await dbService.createBackInStockNotifications(finalProduct.id, finalProduct.name);
            // Removed doubling local toast
        }
    }
    
    await dbService.updateProduct(finalProduct);
  };

  const handleDeleteProduct = async (id: number | string) => {
    // Optimistic Update
    setProducts(prev => prev.filter(p => p.id !== id));
    setSavedIds(prev => prev.filter(sid => sid !== id));
    setComparisonIds(prev => prev.filter(cid => cid !== id));
    setAlertIds(prev => prev.filter(aid => aid !== id));
    // DB Update
    await dbService.deleteProduct(id);
  };

  // Review Handlers
  const handleAddReview = async (productId: number | string, reviewData: { rating: number; comment: string }) => {
    const reviewerName = currentUser?.username || 'Guest User';
    let updatedProduct: Product | undefined;
    
    const newReview: UserReview = {
      id: Date.now() + Math.random(),
      user: reviewerName,
      userId: currentUser?.uid,
      rating: reviewData.rating,
      comment: reviewData.comment,
      productId: productId.toString(),
      date: new Date().toISOString().split('T')[0]
    };

    // DB Update (Separate Collection)
    await dbService.addReview({ ...newReview, productId: productId.toString() });

    // Update Product locally (optimistic)
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const existingReviews = p.userReviews || [];
        const updatedReviews = [newReview, ...existingReviews];
        
        const totalRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = parseFloat((totalRating / updatedReviews.length).toFixed(1));

        updatedProduct = { 
          ...p, 
          userReviews: updatedReviews, 
          rating: avgRating, 
          reviews: updatedReviews.length 
        };
        
        // Update selected product if it's open
        if (selectedProduct && selectedProduct.id === productId) {
            setSelectedProduct(updatedProduct);
        }
        
        return updatedProduct;
      }
      return p;
    }));

    if (updatedProduct) {
      await dbService.updateProduct(updatedProduct);
      addNotification("Review Added", "Thanks for sharing your experience!", "success");
    }
  };

  const handleEditReview = async (productId: number | string, reviewId: number | string, newComment: string, newRating: number) => {
    let updatedProduct: Product | undefined;

    setProducts(prev => prev.map(p => {
      if (String(p.id) === String(productId) && p.userReviews) {
        const updatedReviews = p.userReviews.map(r => 
          String(r.id) === String(reviewId) 
            ? { ...r, comment: newComment, rating: newRating, date: new Date().toISOString().split('T')[0] + " (Edited)" } 
            : r
        );
        
        const totalRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = parseFloat((totalRating / updatedReviews.length).toFixed(1));

        updatedProduct = { ...p, userReviews: updatedReviews, rating: avgRating };
        
        if (selectedProduct && selectedProduct.id === productId) {
            setSelectedProduct(updatedProduct);
        }
        return updatedProduct;
      }
      return p;
    }));

    if (updatedProduct) {
      await dbService.updateProduct(updatedProduct);
      // Also update the standalone review collection
      await dbService.updateReview(reviewId.toString(), { 
        comment: newComment, 
        rating: newRating,
        date: new Date().toISOString().split('T')[0] + " (Edited)"
      });
      addNotification("Review Updated", "Your review has been updated.", "success");
    }
  };

  const handleDeleteReview = async (productId: number | string, reviewId: number | string) => {
    let updatedProduct: Product | undefined;

    setProducts(prev => prev.map(p => {
      if (String(p.id) === String(productId) && p.userReviews) {
        const updatedReviews = p.userReviews.filter(r => String(r.id) !== String(reviewId));
        
        const totalRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = updatedReviews.length > 0 ? parseFloat((totalRating / updatedReviews.length).toFixed(1)) : 0;

        updatedProduct = { 
          ...p, 
          userReviews: updatedReviews, 
          rating: avgRating,
          reviews: updatedReviews.length
        };

        if (selectedProduct && selectedProduct.id === productId) {
            setSelectedProduct(updatedProduct);
        }
        return updatedProduct;
      }
      return p;
    }));

    if (updatedProduct) {
      await dbService.updateProduct(updatedProduct);
      // Also delete from standalone review collection
      await dbService.deleteReview(reviewId.toString());
      addNotification("Review Deleted", "Your review has been removed.", "info");
    }
  };

  // Auth Handlers
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    // Explicitly pass uid to avoid race conditions with auth.currentUser
    const prefs = await dbService.getUserPrefs(user.uid);
    
    // Normalize and Merge guest items with user account items
    const guestSavedStrings = savedIds.map(id => id.toString());
    const dbSavedStrings = prefs.savedIds.map(id => id.toString());
    const mergedSaved = Array.from(new Set([...guestSavedStrings, ...dbSavedStrings]));
    
    const guestAlertStrings = alertIds.map(id => id.toString());
    const dbAlertStrings = prefs.alertIds.map(id => id.toString());
    const mergedAlerts = Array.from(new Set([...guestAlertStrings, ...dbAlertStrings]));

    const guestComparisonStrings = comparisonIds.map(id => id.toString());
    const dbComparisonStrings = prefs.comparisonIds.map(id => id.toString());
    const mergedComparison = Array.from(new Set([...guestComparisonStrings, ...dbComparisonStrings]));
    
    setSavedIds(mergedSaved);
    setAlertIds(mergedAlerts);
    setComparisonIds(mergedComparison);
    
    // Force a sync to DB immediately with merged items
    await dbService.updateUserPrefs(mergedSaved, mergedAlerts, mergedComparison, user.uid);
    
    if (user.isAdmin) {
        setCurrentPage('admin');
    } else {
        setCurrentPage('home'); 
    }
  };

  const handleSignOut = () => {
    AuthService.logout();
    setCurrentUser(null);
    setCurrentPage('home');
    // Clear private states to prevent guest users from seeing previously logged-in user data
    setSavedIds([]);
    setAlertIds([]);
    setComparisonIds([]);
    setStockAlertIds([]);
    addNotification("Signed Out", "You have been signed out.", "info");
  };

  // Comparison Logic
  const handleToggleCompare = (product: Product) => {
    const productIdStr = product.id.toString();
    const exists = comparisonIds.map(String).includes(productIdStr);
    
    if (exists) {
      setComparisonIds(prev => prev.filter(id => id.toString() !== productIdStr));
      addNotification("Removed from Compare", "Product removed from comparison tab.", "info");
    } else {
      if (comparisonIds.length >= 4) {
        alert("You can only compare up to 4 products at a time. Please remove an item to add another.");
        return;
      }
      setComparisonIds(prev => [...prev, productIdStr]);
      addNotification("Added to Compare", "Product added to comparison tab.", "success");
    }
  };

  const handleRemoveFromCompare = (id: number | string) => {
    const idStr = id.toString();
    setComparisonIds(prev => prev.filter(pid => pid.toString() !== idStr));
  };

  const renderPage = () => {
    const contentClass = "pt-24 pb-12";
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      );
    }

    switch (currentPage) {
      case 'home':
        return (
          <div className="">
            <Home 
                onNavigate={setCurrentPage} 
                products={products}
                onViewDetails={setSelectedProduct}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
                alertIds={alertIds}
                onToggleAlert={handleToggleAlert}
                comparisonList={comparisonList}
                onToggleCompare={handleToggleCompare}
            />
          </div>
        );
      case 'products':
        return (
          <div className={contentClass}>
            <Products 
                products={products} 
                savedIds={savedIds} 
                onToggleSave={handleToggleSave}
                comparisonList={comparisonList}
                onToggleCompare={handleToggleCompare}
                alertIds={alertIds}
                onToggleAlert={handleToggleAlert}
                onViewDetails={setSelectedProduct}
                currentUser={currentUser}
            />
          </div>
        );
      case 'saved':
        return (
          <div className={contentClass}>
            <Saved 
                products={products} 
                savedIds={savedIds} 
                onToggleSave={handleToggleSave}
                comparisonList={comparisonList}
                onToggleCompare={handleToggleCompare}
                alertIds={alertIds}
                onToggleAlert={handleToggleAlert}
                onViewDetails={setSelectedProduct}
                currentUser={currentUser}
            />
          </div>
        );
      case 'about':
        return <div className="pt-20"><About /></div>;
      case 'help':
        return <div className="pt-20"><Help /></div>;
      case 'announcements':
        return <div className="pt-20"><Announcements /></div>;
      case 'stores':
        return <div className="pt-24 pb-12"><StoreLocator products={products} /></div>;
      case 'profile':
        return (
            <div className={contentClass}>
                <Profile 
                    user={currentUser} 
                    products={products}
                    savedIds={savedIds}
                    alertIds={alertIds}
                    stockAlertIds={stockAlertIds}
                    notifications={dbNotifications}
                    onMarkNotificationRead={dbService.markNotificationRead}
                    onDeleteNotification={dbService.deleteNotification}
                    onToggleSave={handleToggleSave}
                    onToggleAlert={handleToggleAlert}
                    onToggleStockAlert={handleToggleStockAlert}
                    onEditReview={handleEditReview}
                    onDeleteReview={handleDeleteReview}
                />
            </div>
        );
      case 'terms':
        return <div className={contentClass}><Terms /></div>;
      case 'admin':
        return currentUser?.isAdmin ? (
            <div className={contentClass}>
                <AdminDashboard 
                    products={products} 
                    currentUser={currentUser}
                    onAddProduct={handleAddProduct} 
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onNotify={addNotification}
                />
            </div>
        ) : (
            <div className=""><Home 
                onNavigate={setCurrentPage} 
                products={products}
                onViewDetails={setSelectedProduct}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
                alertIds={alertIds}
                onToggleAlert={handleToggleAlert}
                comparisonList={comparisonList}
                onToggleCompare={handleToggleCompare}
            /></div>
        );
      default:
        return <div className=""><Home 
                onNavigate={setCurrentPage} 
                products={products}
                onViewDetails={setSelectedProduct}
                savedIds={savedIds}
                onToggleSave={handleToggleSave}
                alertIds={alertIds}
                onToggleAlert={handleToggleAlert}
                comparisonList={comparisonList}
                onToggleCompare={handleToggleCompare}
            /></div>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-cream text-espresso selection:bg-accent selection:text-white">
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        savedCount={savedIds.length}
        unreadNotificationsCount={dbNotifications.filter(n => !n.read).length}
        notifications={dbNotifications}
        onMarkNotificationRead={dbService.markNotificationRead}
        onSignInClick={() => setIsLoginModalOpen(true)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />
      
      <main className="flex-grow">
        {renderPage()}
      </main>

      <AIAssistant />
      
      <ComparisonBar 
        comparisonList={comparisonList}
        onRemove={handleRemoveFromCompare}
        onClear={() => setComparisonIds([])}
        onCompare={() => setIsComparisonModalOpen(true)}
      />

      <ComparisonModal 
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        products={comparisonList}
      />

      <NotificationToast 
        notifications={notifications}
        onClose={removeNotification}
      />

      <Footer onNavigate={setCurrentPage} />
      
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onNavigate={setCurrentPage}
      />

      {/* Global Product Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          isSaved={savedIds.map(String).includes(selectedProduct.id.toString())}
          onToggleSave={handleToggleSave}
          isInComparison={comparisonList.some(p => p.id.toString() === selectedProduct.id.toString())}
          onToggleCompare={handleToggleCompare}
          hasAlert={alertIds.map(String).includes(selectedProduct.id.toString())}
          onToggleAlert={handleToggleAlert}
          hasStockAlert={stockAlertIds.includes(selectedProduct.id.toString())}
          onToggleStockAlert={handleToggleStockAlert}
          onAddReview={handleAddReview}
          onEditReview={handleEditReview}
          onDeleteReview={handleDeleteReview}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default App;
