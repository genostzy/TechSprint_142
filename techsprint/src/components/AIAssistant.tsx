import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Loader2, Sparkles, Zap, Cpu, Gamepad2, Laptop, Trash2 } from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: "Hello! I'm SprintBot. I can help you compare prices, check compatibility, or find the best parts for 2025. What are you looking for?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const QUICK_PROMPTS = [
    { text: "What CPU is best for 2025?", icon: Cpu },
    { text: "Budget Gaming PC under ₱30k", icon: Gamepad2 },
    { text: "RTX 4060 vs RX 7600", icon: Zap },
    { text: "Best laptop for students", icon: Laptop }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMessage = textToSend;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // Pass the conversation context to keep context
      const historyForAI = messages.slice(-5).map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'model' as const,
        text: msg.text
      }));
      
      const response = await generateAIResponse(userMessage, historyForAI);
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMessages([
        { role: 'bot', text: "Chat cleared. How can I help you with your tech shopping today?" }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-80 sm:w-96 h-[550px] rounded-3xl shadow-2xl border border-espresso/10 flex flex-col overflow-hidden mb-4 pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-300 ring-1 ring-black/5">
          {/* Header */}
          <div className="bg-espresso p-4 flex justify-between items-center relative overflow-hidden">
            {/* Abstract Background Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            
            <div className="flex items-center space-x-3 text-cream relative z-10">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">SprintBot AI</h3>
                <div className="flex items-center">
                  <span className="relative flex h-2 w-2 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <p className="text-[10px] text-cream/70">Online & Ready</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 relative z-10">
                <button 
                    onClick={handleClearChat}
                    className="p-2 text-cream/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Clear Chat"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
                <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-cream/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                <X className="h-5 w-5" />
                </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scroll-smooth">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {msg.role === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-espresso flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-white" />
                    </div>
                )}
                <div 
                  className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-accent text-white rounded-br-none' 
                      : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {/* Quick Prompts (Only show if there's just the welcome message) */}
            {messages.length === 1 && !isLoading && (
                <div className="mt-6 px-2 animate-in fade-in slide-in-from-bottom-4 delay-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3 ml-1">Suggested Queries</p>
                    <div className="grid grid-cols-1 gap-2">
                        {QUICK_PROMPTS.map((prompt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(prompt.text)}
                                className="flex items-center space-x-3 p-3 bg-white hover:bg-accent hover:text-white border border-gray-200 hover:border-accent rounded-xl transition-all duration-200 text-left group shadow-sm"
                            >
                                <div className="bg-gray-100 group-hover:bg-white/20 p-2 rounded-lg transition-colors">
                                    <prompt.icon className="h-4 w-4 text-gray-600 group-hover:text-white" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 group-hover:text-white">{prompt.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isLoading && (
              <div className="flex justify-start animate-in fade-in">
                <div className="w-8 h-8 rounded-full bg-espresso flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span className="text-xs text-gray-500 font-medium">SprintBot is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2 border border-transparent focus-within:border-accent/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/20 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about parts..."
                className="flex-1 bg-transparent text-espresso text-sm focus:outline-none"
              />
              <button 
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="p-1.5 bg-espresso text-white rounded-full hover:bg-accent disabled:opacity-50 disabled:hover:bg-espresso transition-colors"
              >
                <Send className="h-4 w-4 ml-0.5" />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 mt-2">
                AI can make mistakes. Check prices manually.
            </p>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group pointer-events-auto bg-espresso hover:bg-espresso/90 text-white p-4 rounded-full shadow-glow hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex items-center space-x-2 ring-4 ring-white/20"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <Sparkles className="h-6 w-6 text-accent animate-pulse" />
            <span className="font-bold pr-1">Ask AI</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AIAssistant;