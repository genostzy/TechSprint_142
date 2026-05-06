
import React from 'react';
import { Monitor, Mail, Phone, Facebook, Twitter, Instagram } from 'lucide-react';
import { PageView } from '../types';

interface FooterProps {
  onNavigate?: (page: PageView) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleNav = (page: PageView) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) onNavigate(page);
  };

  return (
    <footer className="bg-espresso text-cream/80 pt-10 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Monitor className="h-6 w-6 text-accent" />
              <span className="font-bold text-xl text-white">TechSprint</span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              Empowering Filipino consumers with transparent pricing and AI-driven insights for a smarter tech shopping experience.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-3">Quick Links</h3>
            <ul className="space-y-1.5 text-sm">
              <li><a href="#" onClick={handleNav('products')} className="hover:text-accent transition-colors">Compare Prices</a></li>
              <li><a href="#" onClick={handleNav('stores')} className="hover:text-accent transition-colors">Store Locator</a></li>
              <li><a href="#" onClick={handleNav('help')} className="hover:text-accent transition-colors">Help & FAQ</a></li>
              <li><a href="#" onClick={handleNav('about')} className="hover:text-accent transition-colors">About Us</a></li>
              <li><a href="#" onClick={handleNav('terms')} className="hover:text-accent transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-3">Contact Us</h3>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>support@techsprint.ph</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>09398341920</span>
              </li>
            </ul>
          </div>
          
          {/* Social Icons Col 4 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white mb-3">Follow Us</h3>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 hover:text-accent cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 hover:text-accent cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 hover:text-accent cursor-pointer transition-colors" />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-center md:text-left">
            &copy; 2024 TechSprint Philippines. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
