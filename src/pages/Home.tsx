
import React from 'react';
import { ArrowRight, Zap, Search, ShieldCheck, Star, TrendingUp, Tag } from 'lucide-react';
import { PageView, Product } from '../types';
import ProductCard from '../components/ProductCard';

interface HomeProps {
  onNavigate: (page: PageView) => void;
  products: Product[];
  onViewDetails: (product: Product) => void;
  savedIds: (number | string)[];
  onToggleSave: (id: number | string) => void;
  alertIds: (number | string)[];
  onToggleAlert: (id: number | string) => void;
  comparisonList: Product[];
  onToggleCompare: (product: Product) => void;
}

const Home: React.FC<HomeProps> = ({ 
  onNavigate, 
  products, 
  onViewDetails,
  savedIds,
  onToggleSave,
  alertIds,
  onToggleAlert,
  comparisonList,
  onToggleCompare
}) => {
  // Filter for Trending (High TechSprint Rating)
  const trendingProducts = [...products]
    .sort((a, b) => (b.techSprintRating || 0) - (a.techSprintRating || 0))
    .slice(0, 3);

  // Filter for Deals (Has original price and is less than current)
  const dealProducts = products
    .filter(p => p.originalPrice && p.originalPrice > p.price)
    .sort((a, b) => {
        const discountA = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
        const discountB = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
        return discountB - discountA;
    })
    .slice(0, 3);

  return (
    <div className="animate-in fade-in duration-700">
      {/* Modern Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px]" />
            <div className="absolute bottom-0 left-[-10%] w-[600px] h-[600px] rounded-full bg-espresso/5 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="lg:w-1/2 text-center lg:text-left z-10">
              <h1 className="text-5xl lg:text-7xl font-extrabold text-espresso mb-6 tracking-tight leading-[1.1]">
                Tech<span className="text-accent">Sprint</span> <br />
                <span className="text-espresso">Shopping.</span>
              </h1>
              <p className="text-lg text-gray-500 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                We unify prices from Online stores and physical stores. 
                Find the best deals on hardware with our AI-powered assistant.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button 
                  onClick={() => onNavigate('products')}
                  className="w-full sm:w-auto bg-espresso text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 hover:shadow-xl hover:shadow-espresso/20 flex items-center justify-center"
                >
                  Start Finding <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <button 
                  onClick={() => onNavigate('about')}
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center"
                >
                  Learn More
                </button>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
                {/* Abstract Floating Cards Visualization */}
                <div className="relative z-10 w-full aspect-square max-w-lg mx-auto">
                    <img 
                        src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" 
                        alt="Tech Setup" 
                        className="w-full h-full object-cover rounded-[2.5rem] shadow-2xl rotate-3 transform transition-transform hover:rotate-0 duration-500"
                    />
                    {/* Floating Elements */}
                    <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-bounce" style={{ animationDuration: '3s' }}>
                        <div className="bg-green-100 p-2 rounded-full">
                            <Zap className="h-5 w-5 text-green-600 fill-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase"></p>
                            <p className="text-sm font-bold text-espresso"></p>
                        </div>
                    </div>
                    <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-bounce" style={{ animationDuration: '4s' }}>
                        <div className="bg-orange-100 p-2 rounded-full">
                            <Star className="h-5 w-5 text-accent fill-accent" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase"></p>
                            <p className="text-sm font-bold text-espresso"></p>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Section */}
      {trendingProducts.length > 0 && (
         <section className="py-16 bg-white border-b border-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-3">
                       <div className="bg-espresso/5 p-2 rounded-lg">
                           <TrendingUp className="h-6 w-6 text-espresso" />
                       </div>
                       <h2 className="text-2xl font-bold text-espresso">Trending Now</h2>
                   </div>
                   <button onClick={() => onNavigate('products')} className="text-accent font-bold text-sm hover:underline">View All</button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                   {trendingProducts.map(product => (
                       <ProductCard 
                          key={product.id}
                          product={product}
                          isSaved={savedIds.map(String).includes(product.id.toString())}
                          onToggleSave={onToggleSave}
                          onViewDetails={onViewDetails}
                          hasAlert={alertIds.map(String).includes(product.id.toString())}
                          onToggleAlert={onToggleAlert}
                          isInComparison={comparisonList.some(cp => cp.id.toString() === product.id.toString())}
                          onToggleCompare={onToggleCompare}
                       />
                   ))}
               </div>
            </div>
         </section>
      )}

      {/* Best Deals Section */}
      {dealProducts.length > 0 && (
         <section className="py-16 bg-orange-50/30 border-b border-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-3">
                       <div className="bg-red-100 p-2 rounded-lg">
                           <Tag className="h-6 w-6 text-red-500" />
                       </div>
                       <h2 className="text-2xl font-bold text-espresso">Best Deals</h2>
                   </div>
                   <button onClick={() => onNavigate('products')} className="text-accent font-bold text-sm hover:underline">View All</button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                   {dealProducts.map(product => (
                       <ProductCard 
                          key={product.id}
                          product={product}
                          isSaved={savedIds.map(String).includes(product.id.toString())}
                          onToggleSave={onToggleSave}
                          onViewDetails={onViewDetails}
                          hasAlert={alertIds.map(String).includes(product.id.toString())}
                          onToggleAlert={onToggleAlert}
                          isInComparison={comparisonList.some(cp => cp.id.toString() === product.id.toString())}
                          onToggleCompare={onToggleCompare}
                       />
                   ))}
               </div>
            </div>
         </section>
      )}

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-espresso mb-4">Built for the Filipino Tech Market</h2>
            <p className="text-gray-500 text-lg">We address specific local challenges with modern solutions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
                {
                    icon: Search,
                    title: "Unified Search",
                    desc: "Search physical store inventories (Gilmore, Malls) and online marketplaces in one unified interface."
                },
                {
                    icon: Zap,
                    title: "Real-Time Updates",
                    desc: "Get accurate pricing and stock status. No more 'PM for price' or going to the store just to find it out of stock."
                },
                {
                    icon: ShieldCheck,
                    title: "Trusted Sources",
                    desc: "We verify listings to reduce exposure to misleading pricing and defective products."
                }
            ].map((feature, idx) => (
                <div key={idx} className="group bg-cream-dark/30 p-8 rounded-3xl border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-xl transition-all duration-300">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <feature.icon className="h-7 w-7 text-espresso" />
                    </div>
                    <h3 className="text-xl font-bold text-espresso mb-3">{feature.title}</h3>
                    <p className="text-gray-500 leading-relaxed">
                        {feature.desc}
                    </p>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant Teaser */}
      <section className="py-24 bg-espresso relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <img 
                    src="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop" 
                    alt="AI Analysis" 
                    className="w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 w-full">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <p className="text-white text-xs font-bold uppercase">SprintBot Analysis</p>
                        </div>
                        <p className="text-white text-sm">"Based on your budget of ₱40k, I recommend the Ryzen 5 5600 paired with an RX 6600 for best 1080p value."</p>
                    </div>
                  </div>
              </div>
            </div>
            <div className="lg:w-1/2 order-1 lg:order-2 text-white">
              <div className="inline-block bg-accent px-3 py-1 rounded-full text-xs font-bold mb-4">POWERED BY GEMINI</div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Meet SprintBot: <br/>Your Personal Tech Expert</h2>
              <p className="text-white/70 text-lg mb-8 leading-relaxed">
                Not sure if that GPU fits your case? Need a laptop for engineering school? SprintBot analyzes thousands of products to give you tailored recommendations instantly.
              </p>
              <div className="space-y-4">
                {['Instant compatibility checks', 'Price history analysis', 'Jargon-free explanations'].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                        <div className="bg-white/10 p-1 rounded-full">
                            <Zap className="h-4 w-4 text-accent" />
                        </div>
                        <p className="font-medium">{item}</p>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
};

export default Home;
