
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where,
  getDoc,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, User, Notification, Announcement, UserReview } from '../types';

const PRODUCTS_COLLECTION = 'products';
const USER_PREFS_COLLECTION = 'user_prefs';
const ALERTS_COLLECTION = 'product_alerts';
const STOCK_ALERTS_COLLECTION = 'stock_alerts';
const REVIEWS_COLLECTION = 'reviews';
const USERS_COLLECTION = 'users';

// Local Storage Keys for Fallback Mode
const LOCAL_PRODUCTS_KEY = 'techsprint_products';

// Helper to remove undefined values which Firestore rejects
const sanitizeData = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

const handleFirestoreError = (error: unknown, operationType: string, path: string | null = null) => {
  if (error instanceof Error && error.message?.includes('insufficient permissions')) {
    const user = auth?.currentUser;
    const errorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: user?.uid || 'anonymous',
        email: user?.email || 'N/A',
        emailVerified: user?.emailVerified || false,
        isAnonymous: user?.isAnonymous || false,
        providerInfo: user?.providerData?.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

export const dbService = {
  connectionTested: false,

  async testConnection() {
    if (!db || this.connectionTested) return;
    try {
      // Use getDocFromServer to strictly test connection on boot
      await getDocFromServer(doc(db, 'test', 'connection'));
      this.connectionTested = true;
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      } else if (error instanceof Error && error.message.includes('quota')) {
        console.warn("Firestore quota exceeded.");
        this.connectionTested = true; // Don't keep retrying if quota is hit
      } else {
        console.warn("Firestore connection check failed", error);
      }
    }
  },

  // --- Products ---

  async getAllProducts(): Promise<Product[]> {
    // 1. Always try LocalStorage first for instant UI
    const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    let cachedProducts: Product[] = [];
    if (stored) {
      try {
        cachedProducts = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse cached products", e);
      }
    }

    if (!db) return cachedProducts;

    try {
      // 2. Fetch from Firebase (Standard getDocs uses cache if available)
      const querySnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
      
      const productsMap = new Map<string | number, Product>();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const docIdNum = Number(doc.id);
        const resolvedId = isNaN(docIdNum) ? (data.id || doc.id) : docIdNum;
        if (!productsMap.has(resolvedId)) {
          productsMap.set(resolvedId, { ...data, id: resolvedId } as Product);
        }
      });
      
      const freshProducts = Array.from(productsMap.values());
      
      // 3. Update cache if we got data
      if (freshProducts.length > 0) {
        localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(freshProducts));
      }
      
      return freshProducts.length > 0 ? freshProducts : cachedProducts;
    } catch (error) {
      const errorString = String(error);
      if (errorString.toLowerCase().includes('quota') || errorString.toLowerCase().includes('exhausted')) {
         console.warn("Using offline product cache due to quota limits.");
      } else {
         console.error("Error getting products: ", error);
      }
      return cachedProducts;
    }
  },

  async addProduct(product: Product): Promise<void> {
    if (!db) {
      // Fallback: Save to LocalStorage
      const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      const products = stored ? JSON.parse(stored) : [];
      products.unshift(product);
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
      return;
    }

    try {
      // Sanitize to remove undefined fields (like location or productUrl when not applicable)
      const cleanProduct = sanitizeData(product);
      await setDoc(doc(db, PRODUCTS_COLLECTION, product.id.toString()), cleanProduct);
    } catch (error) {
      console.error("Error adding product: ", error);
      handleFirestoreError(error, 'create', PRODUCTS_COLLECTION);
    }
  },

  async updateProduct(product: Product): Promise<void> {
    if (!db) {
      // Fallback: Update LocalStorage
      const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      if (stored) {
        const products = JSON.parse(stored) as Product[];
        const updated = products.map(p => p.id === product.id ? product : p);
        localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));
      }
      return;
    }

    try {
      // Sanitize to remove undefined fields
      const cleanProduct = sanitizeData(product);
      await updateDoc(doc(db, PRODUCTS_COLLECTION, product.id.toString()), { ...cleanProduct });
    } catch (error) {
      console.error("Error updating product: ", error);
      handleFirestoreError(error, 'update', PRODUCTS_COLLECTION);
    }
  },

  async deleteProduct(productId: number | string): Promise<void> {
    if (!db) {
      // Fallback: Delete from LocalStorage
      const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      if (stored) {
        const products = JSON.parse(stored) as Product[];
        const filtered = products.filter(p => p.id !== productId);
        localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(filtered));
      }
      return;
    }

    try {
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId.toString()));
    } catch (error) {
      console.error("Error deleting product: ", error);
      throw error;
    }
  },

  // --- Users ---
  
  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    if (!db) {
       // Fallback: Update LocalStorage
       const currentUser = localStorage.getItem('techsprint_current_user');
       if (currentUser) {
          const parsed = JSON.parse(currentUser) as User;
          if (parsed.uid === uid) {
              localStorage.setItem('techsprint_current_user', JSON.stringify({ ...parsed, ...updates }));
          }
       }
       return;
    }

    try {
       await updateDoc(doc(db, USERS_COLLECTION, uid), sanitizeData(updates));
    } catch (error) {
       console.error("Error updating user: ", error);
       handleFirestoreError(error, 'update', `${USERS_COLLECTION}/${uid}`);
    }
  },

  async syncUserEmail(uid: string, username: string, newEmail: string): Promise<void> {
    if (!db) return;
    try {
      // 1. Update users collection
      await updateDoc(doc(db, USERS_COLLECTION, uid), { 
        email: newEmail,
        updatedAt: new Date().toISOString()
      });

      // 2. Update usernames registry
      await updateDoc(doc(db, 'usernames', username), {
        email: newEmail
      });

      // 3. Update local storage
      const stored = localStorage.getItem('techsprint_current_user');
      if (stored) {
        const user = JSON.parse(stored) as User;
        if (user.uid === uid) {
          user.email = newEmail;
          localStorage.setItem('techsprint_current_user', JSON.stringify(user));
        }
      }
    } catch (error) {
       console.error("Error syncing user email: ", error);
       handleFirestoreError(error, 'update', `${USERS_COLLECTION}/${uid}`);
    }
  },

  async getValidEmailsForBroadcast(): Promise<string[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, USERS_COLLECTION));
      const snap = await getDocs(q);
      const emails: string[] = [];
      snap.docs.forEach(doc => {
        const data = doc.data() as User;
        if (data.email && !data.email.endsWith('@techsprint.com')) {
          emails.push(data.email);
        }
      });
      return emails;
    } catch (error) {
      console.error("Error fetching emails for broadcast:", error);
      return [];
    }
  },

  // --- User Preferences (Saved Items & Alerts) ---

  async getUserPrefs(passedUid?: string): Promise<{ savedIds: (number|string)[], alertIds: (number|string)[], comparisonIds: (number|string)[] }> {
    const user = passedUid || auth?.currentUser?.uid;
    if (!db || !user) {
      // Fallback: Get from LocalStorage
      const guestSaved = JSON.parse(localStorage.getItem('techsprint_saved') || '[]');
      const guestAlerts = JSON.parse(localStorage.getItem('techsprint_alerts') || '[]');
      const guestComparison = JSON.parse(localStorage.getItem('techsprint_comparison') || '[]');
      return { savedIds: guestSaved, alertIds: guestAlerts, comparisonIds: guestComparison };
    }

    try {
      // 1. Get user preferences (standard getDoc uses cache)
      const prefsSnap = await getDoc(doc(db, USER_PREFS_COLLECTION, user));
      const data = prefsSnap.exists() ? prefsSnap.data() : {};
      const savedIds = data.savedIds || [];
      const comparisonIds = data.comparisonIds || [];

      // 2. Get alert IDs (subscription-based collection)
      const alertsQuery = query(collection(db, ALERTS_COLLECTION), where("userId", "==", user));
      const alertsSnap = await getDocs(alertsQuery);
      const alertIds = alertsSnap.docs.map(d => d.data().productId?.toString() || "");

      return { savedIds, alertIds, comparisonIds };
    } catch (error) {
      console.error("Error getting user prefs", error);
      // Try local fallback on error (like quota exceeded)
      const guestSaved = JSON.parse(localStorage.getItem('techsprint_saved') || '[]');
      const guestAlerts = JSON.parse(localStorage.getItem('techsprint_alerts') || '[]');
      const guestComparison = JSON.parse(localStorage.getItem('techsprint_comparison') || '[]');
      return { savedIds: guestSaved, alertIds: guestAlerts, comparisonIds: guestComparison };
    }
  },

  async updateUserPrefs(savedIds: (number|string)[], alertIds: (number|string)[], comparisonIds: (number|string)[], passedUid?: string): Promise<void> {
    const user = passedUid || auth?.currentUser?.uid;
    if (!db || !user) {
      localStorage.setItem('techsprint_saved', JSON.stringify(savedIds));
      localStorage.setItem('techsprint_alerts', JSON.stringify(alertIds));
      localStorage.setItem('techsprint_comparison', JSON.stringify(comparisonIds));
      return;
    }

    try {
      // 1. Update Preferences (Strictly Private)
      await setDoc(doc(db, USER_PREFS_COLLECTION, user), {
        savedIds,
        comparisonIds,
        uid: user,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Sync Alert Subscriptions (Visible to Admin for triggers, but isolated from likes)
      const currentAlertsSnap = await getDocs(query(collection(db, ALERTS_COLLECTION), where("userId", "==", user)));
      const currentAlertProductIds = currentAlertsSnap.docs.map(d => d.data().productId.toString());
      
      const newAlertIdsStrings = alertIds.map(id => id.toString());

      const promises = [];

      // Add new alerts
      for (const id of newAlertIdsStrings) {
        if (!currentAlertProductIds.includes(id)) {
          const subId = `${id}_${user}`;
          promises.push(setDoc(doc(db, ALERTS_COLLECTION, subId), {
            productId: id,
            userId: user,
            createdAt: new Date().toISOString()
          }));
        }
      }

      // Remove deleted alerts
      for (const d of currentAlertsSnap.docs) {
        if (!newAlertIdsStrings.includes(d.data().productId.toString())) {
          promises.push(deleteDoc(d.ref));
        }
      }

      await Promise.all(promises);
    } catch (error) {
      console.error("Error updating user prefs", error);
      handleFirestoreError(error, 'update', `${USER_PREFS_COLLECTION}/${user}`);
    }
  },

  // --- Notifications ---
  
  async createProductPriceNotification(productId: string | number, productName: string, oldPrice: number, newPrice: number, updaterId?: string): Promise<void> {
    if (!db) return;
    try {
      // Find subscribers using the isolated ALERTS collection (Privacy-safe: Admin only sees product followers)
      const q = query(collection(db, ALERTS_COLLECTION), where("productId", "==", productId.toString()));
      const querySnapshot = await getDocs(q);
      
      const promises: Promise<void>[] = [];
      querySnapshot.docs.forEach(alertDoc => {
        const userId = alertDoc.data().userId;
        
        // Skip the admin who performed the update
        if (updaterId && userId === updaterId) return;

        const notificationId = `notif_${userId}_${productId}_${Date.now()}`;
        const direction = newPrice < oldPrice ? "dropped" : "changed";
        const title = direction === "dropped" ? "Price Drop Alert!" : "Price Update";
        const message = `Price for ${productName} has ${direction} from ₱${oldPrice.toLocaleString()} to ₱${newPrice.toLocaleString()}!`;
        
        promises.push(setDoc(doc(db, 'notifications', notificationId), {
          id: notificationId,
          userId: userId,
          title,
          message,
          date: new Date().toISOString(),
          read: false,
          productId: productId.toString(),
          type: 'price_change',
          oldPrice,
          newPrice
        }));
      });
      await Promise.all(promises);
    } catch (error) {
      console.error("Error creating notifications", error);
    }
  },

  listenUserNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    if (!db || !userId) return () => {};
    const q = query(collection(db, 'notifications'), where("userId", "==", userId));
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ ...doc.data() as Notification, id: doc.id }));
      callback(notifications);
    });
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read", error);
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error("Error deleting notification", error);
    }
  },

  // --- Reviews ---

  async addReview(review: UserReview & { productId: string | number }): Promise<void> {
    if (!db) {
      // Logic for guest reviews in local storage could go here
      return;
    }
    try {
      const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, REVIEWS_COLLECTION, reviewId), sanitizeData({ ...review, id: reviewId }));
    } catch (error) {
      console.error("Error adding review", error);
    }
  },

  async getReviewsForProduct(productId: string | number): Promise<UserReview[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, REVIEWS_COLLECTION), where("productId", "==", productId.toString()));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as UserReview);
    } catch (error) {
      console.error("Error getting reviews", error);
      return [];
    }
  },

  async updateReview(reviewId: string, updates: Partial<UserReview>): Promise<void> {
    if (!db) return;
    try {
      await updateDoc(doc(db, REVIEWS_COLLECTION, reviewId), sanitizeData(updates));
    } catch (error) {
      console.error("Error updating review", error);
      handleFirestoreError(error, 'update', `${REVIEWS_COLLECTION}/${reviewId}`);
    }
  },

  async deleteReview(reviewId: string): Promise<void> {
    if (!db) return;
    try {
      await deleteDoc(doc(db, REVIEWS_COLLECTION, reviewId));
    } catch (error) {
      console.error("Error deleting review", error);
      handleFirestoreError(error, 'delete', `${REVIEWS_COLLECTION}/${reviewId}`);
    }
  },

  // --- Stock Alerts ---

  async toggleStockAlert(productId: string | number, userId: string, active: boolean): Promise<void> {
    if (!db) return;
    try {
      const alertId = `stock_${productId}_${userId}`;
      if (active) {
        await setDoc(doc(db, STOCK_ALERTS_COLLECTION, alertId), {
          productId: productId.toString(),
          userId,
          createdAt: new Date().toISOString()
        });
      } else {
        await deleteDoc(doc(db, STOCK_ALERTS_COLLECTION, alertId));
      }
    } catch (error) {
      console.error("Error toggling stock alert", error);
    }
  },

  async getUserStockAlerts(userId: string): Promise<string[]> {
    if (!db || !userId) return [];
    try {
      const q = query(collection(db, STOCK_ALERTS_COLLECTION), where("userId", "==", userId));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data().productId.toString());
    } catch (error) {
      console.error("Error getting user stock alerts", error);
      return [];
    }
  },

  async createBackInStockNotifications(productId: string | number, productName: string): Promise<void> {
    if (!db) return;
    try {
      const q = query(collection(db, STOCK_ALERTS_COLLECTION), where("productId", "==", productId.toString()));
      const snap = await getDocs(q);
      
      const promises = snap.docs.map(async (alertDoc) => {
        const userId = alertDoc.data().userId;
        const notificationId = `notif_stock_${userId}_${productId}_${Date.now()}`;
        
        await setDoc(doc(db, 'notifications', notificationId), {
          id: notificationId,
          userId,
          title: 'Back in Stock!',
          message: `${productName} is back in stock! Get it now while supplies last.`,
          date: new Date().toISOString(),
          read: false,
          productId: productId.toString(),
          type: 'stock_alert'
        });
        
        // Clean up the alert after notification sent
        await deleteDoc(alertDoc.ref);
      });
      
      await Promise.all(promises);
    } catch (error) {
      console.error("Error creating stock notifications", error);
    }
  },

  // --- Announcements ---

  async getAllAnnouncements(): Promise<Announcement[]> {
    if (!db) return [];
    try {
      const querySnapshot = await getDocs(collection(db, 'announcements'));
      return querySnapshot.docs.map(doc => ({ ...doc.data() as Announcement, id: doc.id }));
    } catch (error) {
      console.error("Error getting announcements: ", error);
      return [];
    }
  },

  listenAnnouncements(callback: (announcements: Announcement[]) => void) {
    if (!db) return () => {};
    const q = query(collection(db, 'announcements'));
    return onSnapshot(q, (snapshot) => {
      const announcements = snapshot.docs.map(doc => ({ ...doc.data() as Announcement, id: doc.id }));
      callback(announcements);
    });
  },

  async addAnnouncement(announcement: Announcement): Promise<void> {
    if (!db) return;
    try {
      await setDoc(doc(db, 'announcements', announcement.id), sanitizeData(announcement));
    } catch (error) {
      console.error("Error adding announcement: ", error);
      handleFirestoreError(error, 'create', 'announcements');
    }
  },

  async updateAnnouncement(announcement: Announcement): Promise<void> {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'announcements', announcement.id), sanitizeData(announcement));
    } catch (error) {
      console.error("Error updating announcement: ", error);
      handleFirestoreError(error, 'update', `announcements/${announcement.id}`);
    }
  },

  async deleteAnnouncement(id: string): Promise<void> {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error) {
      console.error("Error deleting announcement: ", error);
      handleFirestoreError(error, 'delete', `announcements/${id}`);
    }
  }
};
