
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Announcement } from '../types';
import { Bell, AlertTriangle, Info, Calendar, Megaphone, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Announcements: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = dbService.listenAnnouncements((data) => {
            const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAnnouncements(sorted);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getTypeStyles = (type: Announcement['type']) => {
        switch (type) {
            case 'maintenance': return {
                color: 'text-red-500',
                border: 'border-l-red-500',
                bg: 'bg-red-500/5',
                icon: <AlertTriangle className="h-5 w-5" />,
                badge: 'bg-red-100 text-red-700'
            };
            case 'update': return {
                color: 'text-blue-500',
                border: 'border-l-blue-500',
                bg: 'bg-blue-500/5',
                icon: <Megaphone className="h-5 w-5" />,
                badge: 'bg-blue-100 text-blue-700'
            };
            case 'event': return {
                color: 'text-purple-500',
                border: 'border-l-purple-500',
                bg: 'bg-purple-500/5',
                icon: <Calendar className="h-5 w-5" />,
                badge: 'bg-purple-100 text-purple-700'
            };
            default: return {
                color: 'text-gray-500',
                border: 'border-l-gray-400',
                bg: 'bg-gray-500/5',
                icon: <Info className="h-5 w-5" />,
                badge: 'bg-gray-100 text-gray-700'
            };
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
                <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Fetching announcements...</p>
            </div>
        );
    }

    const activeAnnouncements = announcements.filter(a => a.active);

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col items-center text-center mb-12">
                <div className="bg-accent/10 p-4 rounded-3xl mb-6 shadow-glow">
                    <Megaphone className="h-10 w-10 text-accent" />
                </div>
                <h1 className="text-4xl font-extrabold text-espresso tracking-tight mb-4">
                    Announcements & <span className="text-accent">Updates</span>
                </h1>
                <p className="text-gray-600 text-lg max-w-2xl leading-relaxed">
                    Stay up to date with the latest news from TechSprint, including system maintenance schedules and feature updates.
                </p>
            </div>

            <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                    {activeAnnouncements.length > 0 ? (
                        activeAnnouncements.map((announcement) => {
                            const styles = getTypeStyles(announcement.type);
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={announcement.id}
                                    className={`relative p-6 bg-white rounded-xl border border-gray-100 border-l-4 ${styles.border} shadow-sm transition-all hover:shadow-md group overflow-hidden`}
                                >
                                    {/* Subtle background decoration */}
                                    <div className={`absolute top-0 right-0 p-8 opacity-5 ${styles.color}`}>
                                        {React.cloneElement(styles.icon as React.ReactElement, { className: "w-32 h-32 transform translate-x-12 -translate-y-8" })}
                                    </div>

                                    <div className="relative z-10 flex items-start gap-5">
                                        <div className={`mt-1 p-2.5 rounded-xl ${styles.bg} ${styles.color}`}>
                                            {styles.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${styles.badge}`}>
                                                    {announcement.type}
                                                </span>
                                                {announcement.priority === 'high' && (
                                                    <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm shadow-red-200">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                                        </span>
                                                        URGENT
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-gray-400 font-mono tracking-tighter flex items-center bg-gray-50 px-2 py-1 rounded-md">
                                                    <Calendar className="h-3 w-3 mr-1.5 opacity-60" />
                                                    {new Date(announcement.date).toLocaleDateString('en-US', { 
                                                        year: 'numeric', 
                                                        month: 'short', 
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-espresso mb-3 group-hover:text-accent transition-colors flex items-center gap-2">
                                                {announcement.title}
                                            </h3>
                                            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-[15px] font-medium max-w-3xl border-t border-gray-50 pt-3">
                                                {announcement.content}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-espresso mb-1">No active announcements</h3>
                            <p className="text-gray-500">Check back later for system updates and news.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-16 p-8 bg-espresso text-white rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl group-hover:bg-accent/30 transition-all duration-700"></div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-3">Questions about an update?</h3>
                    <p className="text-gray-300 mb-6 max-w-md">Our support team is here to help with any technical questions regarding maintenance or new features.</p>
                    <button className="bg-accent hover:bg-accent-hover px-8 py-3 rounded-full font-bold transition-all transform hover:-translate-y-1 hover:shadow-glow">
                        Contact Support
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Announcements;
