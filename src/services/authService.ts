
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendEmailVerification, 
  verifyBeforeUpdateEmail, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { User } from '../types';

const USERS_COLLECTION = 'users';
const USERNAMES_COLLECTION = 'usernames';
const CURRENT_USER_KEY = 'techsprint_current_user';

let isGoogleLoginPending = false;

export const AuthService = {
  init: async () => {
    // Initialization is handled by Firebase Auth automatically.
    // Removed the custom admin creation that caused permission errors.
  },

  loginWithGoogle: async (): Promise<User | null> => {
    if (isGoogleLoginPending) {
      console.warn("Google login already in progress.");
      return null;
    }
    
    isGoogleLoginPending = true;
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to show the Google panel and prevent auto-login from previous session
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const userCred = await signInWithPopup(auth, provider);
      
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userCred.user.uid));
      let userObj: User;
      
      const email = userCred.user.email || '';
      const username = userCred.user.displayName || email.split('@')[0] || 'User';
      const photoURL = userCred.user.photoURL || `https://ui-avatars.com/api/?name=${username}&background=random`;
      const isWhitelistedAdmin = email === 'nolascoceline014@gmail.com' || 
                                 email === 'nolascoceline124@gmail.com' || 
                                 email === 'wilsondayritjrapex@gmail.com';
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userObj = {
          uid: userCred.user.uid,
          username: userData.username || userData.displayName || username,
          email: email,
          avatarUrl: userData.avatarUrl || userData.photoURL || photoURL,
          isAdmin: userData.isAdmin || userData.role === 'admin' || isWhitelistedAdmin || false,
        };
      } else {
        // Create new user document for Google Sign-In
        const newUser = {
          username,
          displayName: username,
          email: email,
          avatarUrl: photoURL,
          photoURL: photoURL,
          isAdmin: isWhitelistedAdmin,
          role: isWhitelistedAdmin ? 'admin' : 'user',
          uid: userCred.user.uid,
          likedProducts: []
        };
        await setDoc(doc(db, USERS_COLLECTION, userCred.user.uid), newUser);
        
        // Also register the username for uniqueness
        try {
          await setDoc(doc(db, USERNAMES_COLLECTION, username), {
            uid: userCred.user.uid,
            email: email
          });
        } catch (e) {
          console.warn("Could not register username in mapping, might already exist", e);
        }
        
        userObj = {
          uid: userCred.user.uid,
          username: newUser.username,
          email: newUser.email,
          avatarUrl: newUser.avatarUrl,
          isAdmin: isWhitelistedAdmin,
        };
      }
      
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));
      return userObj;
    } catch (e: unknown) {
      const authError = e as { code?: string };
      if (authError?.code === 'auth/cancelled-popup-request') {
        console.warn("Google Login popup was cancelled by a newer request.");
      } else if (authError?.code === 'auth/popup-closed-by-user') {
        console.warn("Google Login popup was closed by the user.");
      } else {
        console.error("Google Login failed", e);
      }
      return null;
    } finally {
      isGoogleLoginPending = false;
    }
  },

  login: async (emailOrUsername: string, password: string): Promise<User | string | null> => {
    console.log("Login attempt for:", emailOrUsername);
    try {
      let loginEmail = emailOrUsername;
      
      // If it's a username (no @), look up corresponding email in usernames registry
      if (!emailOrUsername.includes('@')) {
        console.log("Looking up email for username:", emailOrUsername);
        try {
          const usernameDoc = await getDoc(doc(db, USERNAMES_COLLECTION, emailOrUsername));
          if (usernameDoc.exists()) {
            loginEmail = usernameDoc.data().email;
            console.log("Found email mapping:", loginEmail);
          } else {
            // Fallback for legacy suffix accounts
            loginEmail = `${emailOrUsername}@techsprint.com`;
            console.log("No mapping found, using fallback:", loginEmail);
          }
        } catch (dbError) {
          console.error("Username lookup failed", dbError);
          // If we can't look up, try the fallback
          loginEmail = `${emailOrUsername}@techsprint.com`;
        }
      }
      
      const userCred = await signInWithEmailAndPassword(auth, loginEmail, password);
      
      // Check if email is verified
      if (!userCred.user.emailVerified) {
        await signOut(auth);
        return "Please verify your email before logging in. Check your inbox for the verification link.";
      }
      
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userCred.user.uid));
      let userObj: User;
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userObj = {
          uid: userCred.user.uid,
          username: userData.username || userData.displayName || loginEmail.split('@')[0],
          email: loginEmail,
          avatarUrl: userData.avatarUrl || userData.photoURL || `https://ui-avatars.com/api/?name=${loginEmail.split('@')[0]}&background=random`,
          isAdmin: userData.isAdmin || userData.role === 'admin' || false,
        };
      } else {
        userObj = {
          uid: userCred.user.uid,
          username: loginEmail.split('@')[0],
          email: loginEmail,
          avatarUrl: `https://ui-avatars.com/api/?name=${loginEmail.split('@')[0]}&background=random`,
          isAdmin: false,
        };
      }
      
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));
      return userObj;
    } catch (e: unknown) {
      console.error("Login failed:", e);
      const errorCode = (e as { code?: string })?.code;
      const errorMessage = (e as { message?: string })?.message || String(e);
      
      if (errorCode === 'auth/operation-not-allowed') {
        throw new Error("Email/Password login is currently disabled in the Firebase Console. Please enable it in 'Authentication > Sign-in method'.");
      }
      
      const isCredentialError = 
        errorCode === 'auth/invalid-credential' || 
        errorCode === 'auth/user-not-found' || 
        errorCode === 'auth/wrong-password' ||
        errorCode === 'auth/invalid-login-credentials' ||
        errorCode === 'auth/invalid-email' ||
        errorMessage.toLowerCase().includes('invalid-credential') ||
        errorMessage.toLowerCase().includes('invalid-login-credentials') ||
        errorMessage.toLowerCase().includes('user-not-found') ||
        errorMessage.toLowerCase().includes('wrong-password') ||
        errorMessage.toLowerCase().includes('auth/invalid-credential') ||
        errorMessage.toLowerCase().includes('auth/invalid-email');

      if (isCredentialError) {
        return "Invalid email/username or password";
      }
      
      if (errorCode === 'auth/too-many-requests' || errorMessage.toLowerCase().includes('too-many-requests')) {
        return "Too many failed login attempts. Please try again later.";
      }

      // Final fallback - try to strip the Firebase: Error prefix if present for cleaner UI
      // Use a more inclusive regex that handles potential whitespace/newlines
      const cleanMessage = errorMessage.replace(/Firebase:\s*Error\s*\(auth\/(.+)\)\./i, '$1').replace(/-/g, ' ').trim();
      return "Login failed: " + (cleanMessage || errorMessage);
    }
  },

  register: async (username: string, email: string, password: string): Promise<User | string> => {
    try {
      // 1. Check if username is already taken in our usernames registry (publicly readable getDoc)
      const usernameDoc = await getDoc(doc(db, USERNAMES_COLLECTION, username));
      if (usernameDoc.exists()) {
        return "This username is already taken. Please choose another one.";
      }

      // 2. Create the user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      
      // 3. Send Verification Email
      try {
        await sendEmailVerification(userCred.user);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      // 4. Create the user profile
      const newUser = {
        username,
        displayName: username,
        email: email,
        avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random`,
        photoURL: `https://ui-avatars.com/api/?name=${username}&background=random`,
        isAdmin: false,
        role: 'user',
        uid: userCred.user.uid,
        likedProducts: []
      };

      await setDoc(doc(db, USERS_COLLECTION, userCred.user.uid), newUser);
      
      // Update Firebase Auth profile
      await updateProfile(userCred.user, {
        displayName: username,
        photoURL: newUser.avatarUrl
      });
      
      // 4. Register the username in the registry for uniqueness and lookup
      await setDoc(doc(db, USERNAMES_COLLECTION, username), {
        uid: userCred.user.uid,
        email: email
      });

      // 5. Sign out immediately so they have to verify first
      await signOut(auth);

      return "Registration successful. Please check your email and verify your account to log in.";
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const errorCode = (e as { code?: string })?.code;
      
      if (errorCode === 'auth/email-already-in-use' || errorMessage.includes('auth/email-already-in-use')) {
        const isDummy = email.endsWith('@techsprint.com');
        return isDummy ? "This username is already taken. Try logging in or use a different username." : "This email is already in use. Try logging in instead.";
      }
      
      console.error("Registration failed", e);
      
      if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('auth/operation-not-allowed')) {
        return "Email/Password registration is currently disabled right now.";
      }
      return "Registration failed. Please try again.";
    }
  },

  resetPassword: async (emailOrUsername: string): Promise<boolean | string> => {
      try {
        let resetEmail = emailOrUsername;
        
        // If it's a username (no @), look up corresponding email in usernames registry
        if (!emailOrUsername.includes('@')) {
          const usernameDoc = await getDoc(doc(db, USERNAMES_COLLECTION, emailOrUsername));
          
          if (usernameDoc.exists()) {
            resetEmail = usernameDoc.data().email;
          } else {
            // Fallback for legacy suffix accounts
            resetEmail = `${emailOrUsername}@techsprint.com`;
          }
        }

        await sendPasswordResetEmail(auth, resetEmail);
        return true;
      } catch (e) {
          console.error("Password reset failed", e);
          const errorCode = (e as { code?: string })?.code;
          if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-email') {
             return "We couldn't find an account matching that email or username.";
          }
          return "An error occurred while trying to send the reset email. Please try again later.";
      }
  },

  updateProfile: async (uid: string, updates: { username?: string, avatarUrl?: string }): Promise<boolean | string> => {
    try {
      if (!auth.currentUser) throw new Error("No user is currently signed in.");
      
      const userDocRef = doc(db, USERS_COLLECTION, uid);
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
        return "Failed to fetch user data.";
      }

      if (!userDoc.exists()) throw new Error("User document not found.");
      const oldUserData = userDoc.data();
      
      const firestoreUpdates: Record<string, string | null | string[]> = { 
        updatedAt: new Date().toISOString() 
      };
      
      if (updates.avatarUrl) {
        firestoreUpdates.avatarUrl = updates.avatarUrl;
        firestoreUpdates.photoURL = updates.avatarUrl;
        
        // Update Firebase Auth profile - photoURL has a limit of ~2KB
        // If it's a data URL (base64) it's likely too long for Auth profile
        if (updates.avatarUrl.length < 2000) {
          try {
            await updateProfile(auth.currentUser, { photoURL: updates.avatarUrl });
          } catch (e) {
            console.error("Auth profile update failed", e);
          }
        }
      }
      
      if (updates.username && updates.username !== oldUserData.username) {
        // 1. Check if new username is taken
        let usernameDoc;
        try {
          usernameDoc = await getDoc(doc(db, USERNAMES_COLLECTION, updates.username));
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `${USERNAMES_COLLECTION}/${updates.username}`);
          return "Failed to verify username availability.";
        }

        if (usernameDoc.exists()) {
          return "This username is already taken.";
        }
        
        // 2. Add new username to registry
        try {
          await setDoc(doc(db, USERNAMES_COLLECTION, updates.username), {
            uid: uid,
            email: auth.currentUser.email
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `${USERNAMES_COLLECTION}/${updates.username}`);
        }
        
        // 3. Remove old username from registry
        if (oldUserData.username) {
          try {
            await deleteDoc(doc(db, USERNAMES_COLLECTION, oldUserData.username));
          } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `${USERNAMES_COLLECTION}/${oldUserData.username}`);
          }
        }
        
        firestoreUpdates.username = updates.username;
        firestoreUpdates.displayName = updates.username;
        // Update Firebase Auth profile
        try {
          await updateProfile(auth.currentUser, { displayName: updates.username });
        } catch (e) {
          console.error("Auth profile update failed", e);
        }
      }
      
      // Update Firestore user document
      try {
        await updateDoc(userDocRef, firestoreUpdates);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
      }
      
      // Update Local Storage
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const user = JSON.parse(stored) as User;
        if (user.uid === uid) {
          if (updates.username) user.username = updates.username;
          if (updates.avatarUrl) user.avatarUrl = updates.avatarUrl;
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        }
      }
      
      return true;
    } catch (e: unknown) {
      console.error("Profile update failed", e);
      if (e instanceof Error && e.message.startsWith('{')) {
          throw e; // Recast JSON error
      }
      return (e as Error).message || "Failed to update profile.";
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed", e);
    }
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  updateEmailAddress: async (newEmail: string): Promise<boolean | string> => {
    try {
      if (!auth.currentUser) throw new Error("No user is currently signed in.");
      
      // verifyBeforeUpdateEmail sends a verification email to the new address
      // and only updates it after verification.
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
      return true;
    } catch (e: unknown) {
      console.error("Email update failed", e);
      const errorCode = (e as { code?: string })?.code;
      if (errorCode === 'auth/requires-recent-login') {
        return "REAUTH_REQUIRED";
      }
      if (errorCode === 'auth/invalid-email') {
        return "Invalid email address format.";
      }
      if (errorCode === 'auth/email-already-in-use') {
        return "This email is already in use by another account.";
      }
      return (e as Error).message || "Failed to update email address.";
    }
  },

  updatePassword: async (newPassword: string): Promise<boolean | string> => {
    try {
      if (!auth.currentUser) throw new Error("No user is currently signed in.");
      await updatePassword(auth.currentUser, newPassword);
      return true;
    } catch (e: unknown) {
      console.error("Password update failed", e);
      const errorCode = (e as { code?: string })?.code;
      if (errorCode === 'auth/requires-recent-login') {
        return "REAUTH_REQUIRED";
      }
      const errorMessage = (e as { message?: string })?.message || String(e);
      const cleanMessage = errorMessage.replace(/^Firebase: Error \(auth\/(.+)\)\.$/, '$1').replace(/-/g, ' ');
      return cleanMessage || errorMessage || "Failed to update password.";
    }
  },

  reauthenticate: async (password: string): Promise<boolean | string> => {
    try {
      const user = auth.currentUser;
      if (!user) return "No user is signed in.";

      // Check providers to see if we should re-auth with Google or Password
      const providers = user.providerData.map(p => p.providerId);
      
      if (providers.includes('google.com') && !providers.includes('password')) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
        return true;
      }
      
      if (!user.email) return "No email associated with this account.";
      
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (e: unknown) {
      console.error("Re-authentication failed", e);
      const errorCode = (e as { code?: string })?.code;
      const errorMessage = (e as { message?: string })?.message || String(e);

      const isCredentialError = 
        errorCode === 'auth/invalid-credential' || 
        errorCode === 'auth/wrong-password' ||
        errorCode === 'auth/invalid-login-credentials' ||
        errorMessage.toLowerCase().includes('invalid-credential') ||
        errorMessage.toLowerCase().includes('wrong-password') ||
        errorMessage.toLowerCase().includes('invalid-login-credentials');

      if (isCredentialError) {
        return "Incorrect password.";
      }

      if (errorCode === 'auth/too-many-requests' || errorMessage.toLowerCase().includes('too-many-requests')) {
        return "Too many attempts. Please try again later.";
      }

      const cleanMessage = errorMessage.replace(/^Firebase: Error \(auth\/(.+)\)\.$/, '$1').replace(/-/g, ' ');
      return cleanMessage || errorMessage || "Re-authentication failed.";
    }
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) return null;
    try {
      const user = JSON.parse(stored) as User;
      // If the stored user doesn't have a UID (stale session from before privacy update), force a re-login
      if (!user.uid) {
        localStorage.removeItem(CURRENT_USER_KEY);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }
};
