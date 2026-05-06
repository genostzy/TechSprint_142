import React from 'react';
import { Target, Users, Lightbulb } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <section className="bg-espresso text-cream py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About TechSprint</h1>
          <p className="text-xl text-cream/80 max-w-3xl mx-auto">
            Building a transparent, efficient, and smarter technology marketplace for every Filipino.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg prose-p:text-gray-600 prose-headings:text-espresso mx-auto mb-16">
            <p className="text-justify mb-8">
              Filipino consumers increasingly rely on online and physical retail platforms to meet their shopping needs. However, navigating the growing number of options and fluctuating prices presents a significant challenge, especially in specialized markets such as computer hardware and accessories.
            </p>
            <p className="text-justify">
              In the Philippines, difficulties in comparing prices, verifying store availability, and accessing up-to-date product information have led to inefficient purchasing experiences. TechSprint was created to solve this.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-4 mb-4">
                <Target className="h-8 w-8 text-accent" />
                <h2 className="text-2xl font-bold text-espresso">Our Mission</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                To unify fragmented market data from online and physical stores, providing consumers with accurate insights to make smarter, cost-efficient purchasing decisions while promoting fair retailer competition.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-4 mb-4">
                <Lightbulb className="h-8 w-8 text-accent" />
                <h2 className="text-2xl font-bold text-espresso">Our Vision</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                To become the Philippines' premier tech aggregator, fostering smarter spending habits and improving overall user convenience and trust in technology retail through AI innovation.
              </p>
            </div>
          </div>
          
          <div className="mt-16 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
            <Users className="h-12 w-12 text-espresso mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-espresso mb-4">Who We Serve</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-bold text-espresso">Students</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-bold text-espresso">Professionals</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-bold text-espresso">Tech Enthusiasts</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-bold text-espresso">Small Businesses</p>
                </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;