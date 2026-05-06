import React from 'react';
import { Shield, Lock, AlertCircle } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-espresso mb-4">Legal Information</h1>
        <p className="text-gray-600">Terms of Service and Privacy Policy</p>
      </div>

      <div className="space-y-8">
        {/* Terms of Service */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-bold text-espresso">Terms of Service</h2>
          </div>
          
          <div className="prose prose-sm text-gray-600 space-y-4">
            <p><strong>1. Acceptance of Terms</strong><br/>By accessing and using TechSprint, you accept and agree to be bound by the terms and provision of this agreement.</p>
            
            <p><strong>2. Accuracy of Information</strong><br/>TechSprint aggregates data from various online and physical retailers. While we strive for accuracy, we cannot guarantee that product descriptions, prices, or stock status are 100% accurate at all times. Prices are subject to change by the respective retailers without notice.</p>
            
            <p><strong>3. Third-Party Links</strong><br/>Our service may contain links to third-party web sites or services that are not owned or controlled by TechSprint. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party web sites.</p>
            
            <p><strong>4. User Conduct</strong><br/>Users are prohibited from using the site to post false reviews, spam, or malicious content. We reserve the right to terminate accounts that violate these rules.</p>
          </div>
        </div>

        {/* Privacy Policy */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-bold text-espresso">Privacy Policy</h2>
          </div>
          
          <div className="prose prose-sm text-gray-600 space-y-4">
            <p><strong>1. Information Collection</strong><br/>We collect information you provide directly to us, such as when you create an account, save items, or post reviews. This includes your username and preference data.</p>
            
            <p><strong>2. Use of Data</strong><br/>We use your data to provide, maintain, and improve our services, such as sending price drop alerts or personalizing recommendations.</p>
            
            <p><strong>3. Data Security</strong><br/>We implement reasonable security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.</p>
            
            <p><strong>4. Cookies</strong><br/>We use cookies to maintain your session and store your preferences (like saved items and alerts) locally on your device or linked to your account.</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex items-start space-x-4">
            <AlertCircle className="h-6 w-6 text-gray-400 flex-shrink-0" />
            <div>
                <h3 className="font-bold text-espresso text-sm mb-1">Disclaimer</h3>
                <p className="text-xs text-gray-500">
                    TechSprint is an aggregator platform. We do not directly sell products. Any transaction you make is strictly between you and the retailer.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;