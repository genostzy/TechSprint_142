
import { GoogleGenAI, Type } from "@google/genai";
import { UserReview, Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const handleAIError = <T>(error: unknown, fallback: T): T => {
  const errorString = typeof error === 'object' ? JSON.stringify(error) : String(error);
  // Detailed logging for debugging
  console.error("Gemini Error Details:", {
    error,
    errorString,
    message: error instanceof Error ? error.message : "No message"
  });

  const isQuotaError = errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429");
  const isBillingError = errorString.includes("credits are depleted") || errorString.includes("billing");

  if (isQuotaError || isBillingError) {
    console.warn("Gemini Service info:", isBillingError ? "Credits depleted/Billing issue." : "Quota limit reached.");
    
    if (typeof fallback === 'string') {
      return (isBillingError 
        ? "The AI service is currently unavailable due to account credit limits. Please check back later."
        : "The AI service is currently at its limit (Quota Exceeded). Please try again later.") as unknown as T;
    }
    if (typeof fallback === 'object' && fallback !== null) {
      return {
        ...fallback,
        summary: isBillingError ? "AI service currently unavailable (Billing/Credits)." : "AI service quota exceeded. Please try again later.",
        recommendation: isBillingError ? "The AI provider account has run out of credits." : "API quota has been reached. Please check back later."
      } as T;
    }
  } else {
    console.error("Gemini Error:", error);
  }
  return fallback;
};

export const analyzeProductSentiment = async (product: Product, techSprintReviews: UserReview[]) => {
    try {
      const internalReviewsText = techSprintReviews.length > 0
        ? techSprintReviews.map(r => `[Rating: ${r.rating}/5] ${r.comment}`).join('\n')
        : "No internal reviews yet.";

      const specsText = product.specs 
        ? Object.entries(product.specs).map(([k, v]) => `${k}: ${v}`).join(', ')
        : "N/A";

      const prompt = `
        You are an expert tech product analyst. Provide a deep, nuanced analysis for:
        Product: "${product.name}"
        Category: "${product.category}"
        Price: ₱${product.price ? product.price.toLocaleString() : 'N/A'}
        Description: ${product.description}
        Tech Specs: ${specsText}
        
        Market Context:
        - Store/Retailer Rating: ${product.storeRating || 'N/A'}/5
        - Community/Internal Reviews:
        ${internalReviewsText}

        Your task is to:
        1. Summarize the overall consensus.
        2. Evaluate "Value for Money" explicitly based on specs vs price.
        3. Provide "Comparison Insights" - how this stacks up against typical competitors in the ${product.category} category.
        4. List specific Pros and Cons.
        5. Give a final verdict/recommendation.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview", // Use Pro for richer analysis
        contents: prompt,
        config: {
          systemInstruction: "You are a professional product analyst. Analyze products deeply. Always respond in JSON format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
              summary: { type: Type.STRING },
              valueForMoney: { type: Type.STRING, description: "Detailed analysis of value relative to price and competition." },
              comparisonInsights: { type: Type.STRING, description: "How it compares to typical category rivals." },
              pros: { type: Type.ARRAY, items: { type: Type.STRING } },
              cons: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING }
            },
            required: ["sentiment", "summary", "valueForMoney", "comparisonInsights", "pros", "cons", "recommendation"]
          }
        }
      });
      
      const text = response.text || "{}";
      return JSON.parse(text);
    } catch (error) {
      return handleAIError(error, {
        sentiment: "Neutral",
        summary: "Detailed analysis currently unavailable.",
        valueForMoney: "Analysis unavailable.",
        comparisonInsights: "Analysis unavailable.",
        pros: [],
        cons: [],
        recommendation: "Please check technical specs for manual comparison."
      });
    }
};

export const generateProductDetails = async (productName: string) => {
  try {
    const prompt = `Generate tech specs and professional description for: "${productName}".`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Generate professional product details as JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            store: { type: Type.STRING },
            storeRating: { type: Type.NUMBER },
            techSprintRating: { type: Type.NUMBER },
            price: { type: Type.NUMBER },
            specs: { 
              type: Type.OBJECT,
              properties: {
                "Processor": { type: Type.STRING },
                "Memory": { type: Type.STRING },
                "Storage": { type: Type.STRING },
                "Display": { type: Type.STRING }
              },
              // For dynamic specs, we usually omit properties or use a more open schema if supported,
              // but standard JSON Schema in Gemini likes explicit properties or we just use general string mapping
            }
          },
          required: ["name", "description", "category"]
        }
      }
    });
    
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    return handleAIError(error, null);
  }
};

export const generatePriceEstimate = async (productName: string) => {
  try {
    const prompt = `Estimate market price in PHP for: "${productName}".`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Estimate price as JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedPrice: { type: Type.NUMBER }
          },
          required: ["estimatedPrice"]
        }
      }
    });
    
    const text = response.text || "{}";
    const data = JSON.parse(text);
    return data.estimatedPrice || 0;
  } catch (error) {
    return handleAIError(error, 0);
  }
};

export const generateAIResponse = async (prompt: string, history: { role: string; parts?: { text: string }[]; text?: string }[] = []) => {
  try {
    // Convert history to match GenerateContentParameters contents array expectations if needed
    // But direct sendMessage/chat is often easier. 
    // However, the skill suggests using ai.models.generateContent for everything.
    
    const contents = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.parts?.[0]?.text || h.text || "" }]
    }));
    
    contents.push({ role: 'user', parts: [{ text: prompt }] });
      
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents
    });
    
    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    return handleAIError(error, "I'm sorry, I'm having trouble processing that request right now.");
  }
};

export const summarizeAllReviews = async (products: Product[]) => {
    try {
        const allReviews = products.flatMap(p => p.userReviews || []);
        if (allReviews.length === 0) return "No user reviews available to analyze yet.";

        const reviewsText = allReviews.map(r => `[Rating: ${r.rating}/5] ${r.comment}`).join('\n');
        
        const prompt = `
            You are a product experience analyst for TechSprint.
            Analyze the overall community sentiment based on these reviews:
            ${reviewsText}

            Provide a concise (2-3 sentences) summary of what users are generally saying about the products and service.
            Focus on recurring themes, common praises, and typical complaints.
        `;

        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                systemInstruction: "You are a brief, professional analytics reporter. Provide text summaries."
            }
        });

        return result.text || "Unable to generate summary.";
    } catch (error) {
        return handleAIError(error, "Sentiment analysis is currently unavailable.");
    }
};

export const generateSearchSuggestions = async (searchTerm: string = "") => {
  try {
    const prompt = searchTerm 
      ? `Based on the search term "${searchTerm}", suggest 5 popular or trending hardware components or tech categories that Filipino PC builders might be looking for. Return as a clean JSON array of strings.`
      : `Suggest 5 popular or trending PC hardware components or categories (e.g., RTX 4060, Ryzen 7, Mechanical Keyboards) currently trending in the Philippines. Return as a clean JSON array of strings.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a tech retail assistant. Suggest trending search terms. Respond ONLY with a JSON array of strings.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text) as string[];
  } catch (error) {
    return handleAIError(error, ["RTX 4060", "Ryzen 7000", "B650 Motherboard", "NVMe SSD", "Gaming Monitor"]);
  }
};

export const geminiService = {
  analyzeProductSentiment,
  generateProductDetails,
  generatePriceEstimate,
  generateAIResponse,
  summarizeAllReviews,
  generateSearchSuggestions
};
