
import React, { useState } from 'react';
import { ShieldCheck, Search, BarChart3, HelpCircle, ChevronDown, ChevronUp, Monitor, Users } from 'lucide-react';

const Help: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Does TechSprint sell these products?",
      a: "No. TechSprint is an aggregator. We search prices from trusted stores like PC Express, Shopee, and Lazada, and show them to you in one place. When you click 'Buy', you are directed to the actual seller."
    },
    {
      q: "How often are prices updated?",
      a: "We use automated systems to update prices regularly. However, prices on the retailer's site can change instantly. Always double-check the final price on the store's page before checking out."
    },
    {
      q: "What is the TechSprint Rating?",
      a: "The TechSprint Rating (Zap icon) is an AI-generated score representing 'Value for Money'. It considers the product's specs relative to its current price in the Philippine market."
    },
    {
      q: "Can I return items to TechSprint?",
      a: "Since you purchase directly from the retailers (e.g., Shopee, Lazada, PC Express), all returns and warranties are handled by them. Please check the specific store's return policy."
    }
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Hero */}
      <section className="bg-espresso text-white py-20 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <HelpCircle className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
          <p className="text-cream/80 text-lg">
            Learn how TechSprint makes tech shopping safer, faster, and smarter.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Why Trust Us */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-espresso text-center mb-12">Why Trust TechSprint?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
              <div className="bg-green-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-espresso mb-2">Verified Sellers Only</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                We filter out scammers. We only aggregate data from authorized dealers, flagship stores on Lazada/Shopee, and reputable physical shops.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
              <div className="bg-blue-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-espresso mb-2">Transparent Pricing</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                We show you the price history. We'll tell you if a "Sale" is real or if the price was jacked up before being discounted.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
              <div className="bg-orange-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-bold text-lg text-espresso mb-2">Community Driven</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Our reviews come from real users. You can see what other Filipino tech enthusiasts are saying about specific parts and stores.
              </p>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <div className="mb-20 bg-cream-dark/20 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-espresso text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
             {/* Connector Line (Desktop) */}
             <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gray-200 -z-10 transform translate-y-4"></div>

             <div className="text-center relative">
                <div className="bg-white w-16 h-16 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center mx-auto mb-4 z-10 relative">
                    <Search className="h-7 w-7 text-espresso" />
                </div>
                <h3 className="font-bold text-lg text-espresso">1. Search</h3>
                <p className="text-sm text-gray-600 mt-2">Type the part you need. We scan online and physical inventories instantly.</p>
             </div>

             <div className="text-center relative">
                <div className="bg-white w-16 h-16 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center mx-auto mb-4 z-10 relative">
                    <BarChart3 className="h-7 w-7 text-espresso" />
                </div>
                <h3 className="font-bold text-lg text-espresso">2. Compare</h3>
                <p className="text-sm text-gray-600 mt-2">See prices side-by-side. Check our AI "Value Score" to see if it's worth it.</p>
             </div>

             <div className="text-center relative">
                <div className="bg-white w-16 h-16 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center mx-auto mb-4 z-10 relative">
                    <Monitor className="h-7 w-7 text-espresso" />
                </div>
                <h3 className="font-bold text-lg text-espresso">3. Buy</h3>
                <p className="text-sm text-gray-600 mt-2">Click "View Deal" to go to the seller's page or get directions to the store.</p>
             </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-espresso text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
                {faqs.map((faq, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <button 
                            onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left font-bold text-espresso hover:bg-gray-50 transition-colors"
                        >
                            <span>{faq.q}</span>
                            {openFaq === idx ? <ChevronUp className="h-5 w-5 text-accent" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </button>
                        {openFaq === idx && (
                            <div className="px-6 pb-6 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-4 bg-gray-50/30">
                                {faq.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default Help;
