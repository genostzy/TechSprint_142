import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Heart, Search, Monitor, Shield, User, LogOut, Bell } from 'lucide-react';
import { PageView, User as UserType, Notification } from '../types';

interface NavbarProps {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  savedCount: number;
  unreadNotificationsCount?: number;
  notifications?: Notification[];
  onMarkNotificationRead?: (id: string | number) => void;
  onSignInClick: () => void;
  currentUser: UserType | null;
  onSignOut: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  currentPage, 
  setCurrentPage, 
  savedCount, 
  unreadNotificationsCount = 0,
  notifications = [],
  onMarkNotificationRead,
  onSignInClick, 
  currentUser, 
  onSignOut 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const navItems: { label: string; value: PageView }[] = [
    { label: 'Home', value: 'home' },
    { label: 'Products', value: 'products' },
    { label: 'Announcements', value: 'announcements' },
    { label: 'About Us', value: 'about' },
  ];

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'glass-nav py-2' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex-shrink-0 flex items-center cursor-pointer group" 
            onClick={() => setCurrentPage('home')}
          >
            <div className="bg-espresso text-white p-2 rounded-xl mr-3 shadow-glow group-hover:scale-105 transition-transform">
                <Monitor className="h-6 w-6" />
            </div>
            <span className={`font-bold text-2xl tracking-tight ${scrolled ? 'text-espresso' : 'text-espresso'}`}>
              Tech<span className="text-accent">Sprint</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:block bg-white/80 backdrop-blur-md px-6 py-2.5 rounded-full shadow-soft border border-white/50">
            <div className="flex items-baseline space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setCurrentPage(item.value)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    currentPage === item.value
                      ? 'text-white bg-espresso shadow-lg'
                      : 'text-gray-500 hover:text-espresso hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {currentUser?.isAdmin && (
                <button
                  onClick={() => setCurrentPage('admin')}
                  className={`px-4 py-2 rounded-full text-sm font-bold flex items-center transition-all duration-200 ${
                    currentPage === 'admin'
                      ? 'text-white bg-accent shadow-glow'
                      : 'text-accent hover:bg-accent/5'
                  }`}
                >
                  <Shield className="h-3 w-3 mr-1.5" />
                  Admin
                </button>
              )}
            </div>
          </div>

          {/* Icons */}
          <div className="hidden md:flex items-center space-x-3">
            <button 
              onClick={() => setCurrentPage('products')}
              className="p-2.5 rounded-full text-espresso hover:bg-black/5 transition-colors"
              title="Search Products"
            >
              <Search className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setCurrentPage('saved')}
              className="relative p-2.5 rounded-full text-espresso hover:bg-black/5 transition-colors"
              title="Saved Items"
            >
              <Heart className="h-5 w-5" />
              {savedCount > 0 && (
                <span className="absolute top-1 right-1 bg-accent text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                  {savedCount}
                </span>
              )}
            </button>

            {!currentUser?.isAdmin && currentUser && (
              <div className="relative" ref={notifDropdownRef}>
                <button 
                  onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                  className="relative p-2.5 rounded-full text-espresso hover:bg-black/5 transition-colors"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 bg-accent text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
                {isNotifDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl py-2 text-espresso animate-in fade-in slide-in-from-top-2 border border-gray-100 z-50">
                    <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center">
                      <p className="font-bold">Notifications</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-center text-gray-500">No recent notifications.</p>
                      ) : (
                        notifications.map((notif: Notification) => (
                          <div 
                            key={notif.id} 
                            className={`px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 flex flex-col gap-1 cursor-pointer ${notif.read ? 'opacity-60' : ''}`}
                            onClick={() => {
                              if (!notif.read && onMarkNotificationRead) {
                                onMarkNotificationRead(notif.id);
                              }
                            }}
                          >
                            <p className="font-bold text-sm tracking-tight">{notif.title}</p>
                            <p className="text-xs text-gray-600 leading-snug">{notif.message}</p>
                            {notif.date && <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.date).toLocaleString()}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth Button / Profile Dropdown */}
            {currentUser ? (
              <div className="relative ml-2" ref={dropdownRef}>
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="relative flex items-center space-x-2 bg-white pl-1.5 pr-3 py-1.5 rounded-full transition-all border border-gray-200 hover:border-accent hover:shadow-md"
                >
                  <img 
                    src={currentUser.avatarUrl} 
                    alt="Profile" 
                    className="h-8 w-8 rounded-full object-cover bg-gray-100"
                  />
                  <span className="text-sm font-bold text-espresso max-w-[100px] truncate">{currentUser.username}</span>
                  {unreadNotificationsCount > 0 && !currentUser.isAdmin && (
                    <span className="absolute -top-1 -right-1 bg-accent text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse ring-2 ring-white">
                        {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl py-2 text-espresso animate-in fade-in slide-in-from-top-2 border border-gray-100 z-50">
                    <div className="px-4 py-3 border-b border-gray-50 mb-1">
                        <p className="text-xs text-gray-400 font-semibold uppercase">Signed in as</p>
                        <p className="font-bold truncate">{currentUser.username}</p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentPage('profile');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-espresso hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2.5" />
                        My Profile
                      </div>
                      {unreadNotificationsCount > 0 && !currentUser.isAdmin && (
                        <span className="bg-accent text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {unreadNotificationsCount}
                        </span>
                      )}
                    </button>
                    {/* My Wishlist - Hidden for admins as redundant */}
                    {!currentUser.isAdmin && (
                      <button
                        onClick={() => {
                          setCurrentPage('saved');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-espresso hover:bg-gray-50 transition-colors"
                      >
                        <Heart className="h-4 w-4 mr-2.5" />
                        My Wishlist
                      </button>
                    )}
                    {currentUser.isAdmin && (
                      <button
                        onClick={() => {
                          setCurrentPage('admin');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/5 transition-colors"
                      >
                        <Shield className="h-4 w-4 mr-2.5" />
                        Admin Dashboard
                      </button>
                    )}
                    <div className="border-t border-gray-50 my-1"></div>
                    <button
                      onClick={() => {
                        onSignOut();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={onSignInClick}
                className="ml-2 bg-espresso hover:bg-gray-800 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-espresso hover:bg-gray-100 focus:outline-none"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-xl absolute w-full">
          <div className="px-4 pt-4 pb-6 space-y-2">
            
            {/* Mobile User Profile Header */}
            {currentUser && (
              <div className="flex items-center space-x-3 px-2 py-4 mb-2 bg-gray-50 rounded-xl">
                <img 
                  src={currentUser.avatarUrl} 
                  alt="Profile" 
                  className="h-10 w-10 rounded-full object-cover border border-white shadow-sm"
                />
                <div>
                  <p className="text-espresso font-bold">{currentUser.username}</p>
                  <p className="text-gray-500 text-xs">Active Member</p>
                </div>
              </div>
            )}

            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setCurrentPage(item.value);
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-xl text-base font-bold transition-colors ${
                  currentPage === item.value
                    ? 'text-accent bg-accent/5'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}

            {currentUser?.isAdmin && (
              <button
                onClick={() => {
                  setCurrentPage('admin');
                  setIsMenuOpen(false);
                }}
                className={`flex items-center w-full text-left px-4 py-3 rounded-xl text-base font-bold text-accent hover:bg-accent/5`}
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Dashboard
              </button>
            )}

            <button
              onClick={() => {
                setCurrentPage('saved');
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center px-4 py-3 rounded-xl text-base font-medium text-gray-600 hover:bg-gray-50"
            >
              <Heart className="h-4 w-4 mr-3" />
              Saved Items ({savedCount})
            </button>

              {currentUser ? (
                <>
                  <button
                    onClick={() => {
                      setCurrentPage('profile');
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center px-4 py-3 rounded-xl text-base font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4 mr-3" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      onSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center px-4 py-3 rounded-xl text-base font-medium text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onSignInClick();
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-center px-4 py-3 mt-4 rounded-xl text-base font-bold bg-espresso text-white shadow-lg"
                >
                  Sign In
                </button>
              )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;