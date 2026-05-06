import React, { useEffect } from 'react';
import { X, Bell, CheckCircle2, TrendingDown } from 'lucide-react';
import { Notification } from '../types';

interface NotificationToastProps {
  notifications: Notification[];
  onClose: (id: number | string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onClose }) => {
  return (
    <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifications.map((note) => (
        <ToastItem key={note.id} notification={note} onClose={onClose} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notification: Notification; onClose: (id: number | string) => void }> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000); // Auto dismiss after 5 seconds
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  let Icon = Bell;
  let bgClass = "bg-white";
  let borderClass = "border-gray-200";
  let textClass = "text-espresso";

  switch (notification.type) {
    case 'success':
      Icon = CheckCircle2;
      bgClass = "bg-green-50";
      borderClass = "border-green-200";
      textClass = "text-green-800";
      break;
    case 'alert':
      Icon = TrendingDown;
      bgClass = "bg-white";
      borderClass = "border-accent";
      textClass = "text-espresso";
      break;
    default:
      Icon = Bell;
  }

  return (
    <div className={`pointer-events-auto w-80 p-4 rounded-xl shadow-xl border ${borderClass} ${bgClass} flex items-start gap-3 animate-in slide-in-from-right duration-300`}>
      <div className={`p-2 rounded-full ${notification.type === 'alert' ? 'bg-accent text-white' : 'bg-white border border-gray-100'}`}>
        <Icon className={`h-5 w-5 ${notification.type === 'alert' ? 'text-white' : textClass}`} />
      </div>
      <div className="flex-1">
        <h4 className={`font-bold text-sm ${textClass}`}>{notification.title}</h4>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notification.message}</p>
      </div>
      <button 
        onClick={() => onClose(notification.id)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default NotificationToast;