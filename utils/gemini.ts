import { ElementData } from '../types';

/**
 * Calls Gemini API to generate an explanation about a newly created element/compound
 */
// Access API key - vite.config.ts injects GEMINI_API_KEY as __GEMINI_API_KEY__
declare const __GEMINI_API_KEY__: string | undefined;

export async function getElementExplanation(element: ElementData): Promise<string> {
  // Try multiple ways to get the API key:
  // 1. VITE_GEMINI_API_KEY (standard Vite env var, user sets VITE_GEMINI_API_KEY in .env)
  // 2. __GEMINI_API_KEY__ (injected by vite.config.ts from GEMINI_API_KEY)
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
                 (typeof __GEMINI_API_KEY__ !== 'undefined' ? __GEMINI_API_KEY__ : undefined);
  
  if (!apiKey) {
    console.warn('Gemini API key not found, using fallback explanation');
    return getFallbackExplanation(element);
  }

  try {
    const prompt = `You are a friendly chemistry lab assistant named Atom. A student just created ${element.name} (${element.symbol}) by mixing elements in a chemistry lab simulation. 

Give a brief, engaging explanation (2-3 sentences max) about what ${element.name} is and why it's interesting or important. Be enthusiastic and educational, like you're teaching a curious student. Keep it conversational and fun.

Element details:
- Name: ${element.name}
- Symbol: ${element.symbol}
- Description: ${element.description || 'N/A'}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (explanation) {
      // Clean up the response (remove markdown formatting if any)
      return explanation.trim().replace(/\*\*/g, '').replace(/\*/g, '');
    }

    return getFallbackExplanation(element);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return getFallbackExplanation(element);
  }
}

/**
 * Fallback explanation if Gemini API fails or is unavailable
 */
function getFallbackExplanation(element: ElementData): string {
  if (element.atomicNumber === 0) {
    return `Amazing! You've created ${element.name}! This compound has unique properties that make it different from its individual elements.`;
  }
  return `Great discovery! ${element.name} is a fascinating element. ${element.description || 'It has many interesting properties and uses.'}`;
}

