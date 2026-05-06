
import React, { useState } from 'react';
import { X, Lock, User as UserIcon, ArrowRight, Loader2, Eye, EyeOff, Check, Mail, ArrowLeft } from 'lucide-react';
import { AuthService } from '../services/authService';
import { User, PageView } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onNavigate: (page: PageView) => void;
}

type ModalView = 'login' | 'signup' | 'forgot';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess, onNavigate }) => {
  const [view, setView] = useState<ModalView>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [username, setUsername] = useState('');
  
  // Password States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Sign Up Specifics
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {
      if (view === 'login') {
        const result = await AuthService.login(emailOrUsername, password);
        if (result && typeof result !== 'string') {
          onLoginSuccess(result);
          handleClose();
        } else if (typeof result === 'string') {
          setError(result);
        } else {
          setError('Invalid email/username or password');
        }
      } else if (view === 'signup') {
        // Sign Up Validation
        if (!username || !emailOrUsername || !password || !confirmPassword) {
          setError('Please fill in all required fields including username, email, and password');
          setLoading(false);
          return;
        }

        if (!emailRegex.test(emailOrUsername)) {
          setError('Please enter a valid email address format (e.g., user@example.com)');
          setLoading(false);
          return;
        }

        if (username.length < 3) {
          setError('Username must be at least 3 characters long');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters long');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (!acceptTerms) {
          setError('You must accept the Terms & Conditions');
          setLoading(false);
          return;
        }
        
        const result = await AuthService.register(username, emailOrUsername, password);
        if (typeof result === 'string') {
          if (result.includes('successful')) {
             setSuccessMsg(result);
             setView('login');
             setEmailOrUsername('');
             setUsername('');
             setPassword('');
             setConfirmPassword('');
          } else {
             setError(result);
          }
        } else {
          onLoginSuccess(result);
          handleClose();
        }
      } else if (view === 'forgot') {
        if (!emailOrUsername) {
          setError('Please enter your email or username');
          setLoading(false);
          return;
        }

        const result = await AuthService.resetPassword(emailOrUsername);
        if (typeof result === 'string') {
          setError(result);
        } else if (result === true) {
          setSuccessMsg("Password reset email sent! Check your inbox.");
          setTimeout(() => {
            setView('login');
            setSuccessMsg('');
            setEmail('');
          }, 3000);
        } else {
          setError("Failed to send reset email. Please try again later.");
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset All State
    setEmailOrUsername('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
    setView('login');
    setLoading(false);
    setShowPassword(false);
    setAcceptTerms(false);
    onClose();
  };

  const handleTermsClick = () => {
    handleClose();
    onNavigate('terms');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-espresso/80 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] overflow-y-auto">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-espresso transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="bg-accent/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
            {view === 'login' ? <Lock className="h-7 w-7 text-accent" /> : 
             view === 'signup' ? <UserIcon className="h-7 w-7 text-accent" /> :
             <Mail className="h-7 w-7 text-accent" />}
          </div>
          <h2 className="text-2xl font-bold text-espresso">
            {view === 'login' ? 'Welcome Back' : 
             view === 'signup' ? 'Join TechSprint' : 
             'Reset Password'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {view === 'login' ? 'Enter your credentials to access your account.' : 
             view === 'signup' ? 'Create an account to track prices and save items.' :
             'Enter your email or username to receive a password reset link.'}
          </p>
        </div>

        {/* Toggle Tabs (Only for Login/Signup) */}
        {view !== 'forgot' && (
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
                type="button"
                onClick={() => { setView('login'); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                view === 'login' ? 'bg-white text-espresso shadow-sm' : 'text-gray-500 hover:text-espresso'
                }`}
            >
                Sign In
            </button>
            <button
                type="button"
                onClick={() => { setView('signup'); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                view === 'signup' ? 'bg-white text-espresso shadow-sm' : 'text-gray-500 hover:text-espresso'
                }`}
            >
                Sign Up
            </button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* FORGOT PASSWORD FLOW */}
          {view === 'forgot' && (
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Email or Username</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none"
                        placeholder="Enter email or username"
                        required
                    />
                </div>
            </div>
          )}

          {/* LOGIN / SIGNUP FLOW */}
          {view !== 'forgot' && (
              <>
                {view === 'signup' && (
                    <div className="animate-in slide-in-from-top-2 fade-in">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Username</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                                placeholder="Choose a username"
                                required={view === 'signup'}
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                        {view === 'signup' ? 'Email' : 'Email or Username'}
                    </label>
                    <div className="relative">
                    {view === 'signup' ? (
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    ) : (
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    )}
                    <input
                        type="text"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                        placeholder={view === 'signup' ? "Enter your email" : "Enter email or username"}
                        required
                    />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Password</label>
                    <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                        placeholder="Enter password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    </div>
                    {view === 'signup' && (
                         <p className="text-[10px] text-gray-400 mt-1 ml-1">Must be at least 6 characters long.</p>
                    )}
                </div>

                {view === 'signup' && (
                    <div className="animate-in slide-in-from-top-2 fade-in space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all ${
                                    confirmPassword && password !== confirmPassword 
                                    ? 'border-red-300 focus:border-red-500' 
                                    : 'border-gray-200 focus:border-accent'
                                }`}
                                placeholder="Re-enter password"
                                required
                                />
                            </div>
                        </div>
                    </div>
                )}

                {view === 'signup' && (
                    <div className="flex items-start space-x-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setAcceptTerms(!acceptTerms)}
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        acceptTerms ? 'bg-accent border-accent text-white' : 'bg-white border-gray-300'
                        }`}
                    >
                        {acceptTerms && <Check className="h-3 w-3" />}
                    </button>
                    <p className="text-xs text-gray-500 leading-tight">
                        I agree to the <span onClick={handleTermsClick} className="text-accent cursor-pointer hover:underline">Terms of Service</span> and <span onClick={handleTermsClick} className="text-accent cursor-pointer hover:underline">Privacy Policy</span>.
                    </p>
                    </div>
                )}
                
                {/* Forgot Password Link */}
                {view === 'login' && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => { setView('forgot'); setError(''); }}
                            className="text-xs font-bold text-accent hover:underline"
                        >
                            Forgot Password?
                        </button>
                    </div>
                )}
              </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-500 text-xs font-medium text-center flex items-center justify-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {error}
            </div>
          )}
          
          {successMsg && (
              <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-green-700 text-xs font-medium text-center flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> {successMsg}
              </div>
          )}

          <div className="flex gap-2">
              {view === 'forgot' && (
                  <button 
                    type="button"
                    onClick={() => {
                        setView('login');
                        setError('');
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-4 rounded-xl transition-all"
                  >
                      <ArrowLeft className="h-5 w-5" />
                  </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-espresso hover:bg-espresso/90 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-espresso/20 flex items-center justify-center group disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                <>
                    {view === 'login' ? 'Sign In' : 
                     view === 'signup' ? 'Sign Up' : 
                     'Reset Password'}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
                )}
            </button>
          </div>
          
          {view !== 'forgot' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  const user = await AuthService.loginWithGoogle();
                  setLoading(false);
                  if (user) {
                    onLoginSuccess(user);
                    handleClose();
                  } else {
                    setError('Google Sign-In failed or was cancelled.');
                  }
                }}
                disabled={loading}
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
