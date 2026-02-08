// lib/services/geminiService.ts
// Google Gemini integration for PDF invoice extraction

import { GoogleGenerativeAI } from '@google/generative-ai';

import { InvoiceData, PaymentPlan } from '@/app/types';
import type { ChatHistoryMessage } from '@/app/types/chat';

interface ChatContext {
  message: string;
  hasFile: boolean;
  fileName: string | null;
  history: ChatHistoryMessage[];
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

/**
 * Extract invoice data from PDF using Gemini Vision
 * Converts PDF to images and uses multimodal AI to extract fields
 */
export async function extractInvoiceFromPDF(
  pdfBuffer: Buffer,
  fileName: string
): Promise<InvoiceData> {
  try {
    console.log(`📄 Processing PDF: ${fileName}`);

    // Convert PDF buffer to base64
    const base64PDF = pdfBuffer.toString('base64');

    // Use Gemini 2.0 Flash with multimodal capabilities
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    // Load prompt from prompts/gemini-prompts.md
    const extractionPrompt = `You are a CFO assistant extracting data from an invoice PDF.

Extract the following information:
1. **Wallet Address**: Ethereum wallet address (0x...)
2. **Amount**: Payment amount with currency (e.g., "5000 USDC", "2.5 ETH")
3. **Recipient**: Vendor/company name receiving payment
4. **Purpose**: Description of what the payment is for

Return ONLY a JSON object in this exact format:
{
  "walletAddress": "0x...",
  "amount": "...",
  "recipient": "...",
  "purpose": "..."
}

If any field is missing or unclear, use "NOT_FOUND".
Be precise with wallet addresses - they must be valid Ethereum addresses starting with 0x followed by 40 hexadecimal characters.`;

    // Generate content with PDF
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: extractionPrompt },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64PDF,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent extraction
        maxOutputTokens: 1024,
      },
    });

    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    // Gemini might wrap it in markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    // Validate extracted data
    const invoiceData: InvoiceData = {
      walletAddress: extractedData.walletAddress || 'NOT_FOUND',
      amount: extractedData.amount || 'NOT_FOUND',
      recipient: extractedData.recipient || 'NOT_FOUND',
      purpose: extractedData.purpose || 'NOT_FOUND',
    };

    // Validate Ethereum address format
    if (invoiceData.walletAddress !== 'NOT_FOUND') {
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(invoiceData.walletAddress);
      if (!isValidAddress) {
        console.warn('⚠️ Invalid Ethereum address format detected');
      }
    }

    console.log('✅ Invoice extraction complete:', {
      wallet: invoiceData.walletAddress.substring(0, 10) + '...',
      amount: invoiceData.amount,
    });

    return invoiceData;

  } catch (error) {
    console.error('❌ Gemini extraction error:', error);
    throw error;
  }
}

function buildChatPrompt(context: ChatContext): string {
  const history = context.history.length > 0
    ? context.history
    : [{ role: 'user', content: context.message }];

  const historyText = history
    .map(entry => `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`)
    .join('\n');

  const fileContext = context.hasFile
    ? `A PDF invoice named \"${context.fileName ?? 'uploaded invoice'}\" is available for analysis.`
    : 'No invoice file has been uploaded yet.';

  return `
You are Tresora's CFO assistant. Be concise, helpful, and grounded. 
If the user asks to analyze an invoice and a file is available, acknowledge and say you will start the analysis. 
If no file is available, ask them to upload a PDF. 
Do not fabricate invoice details you have not seen.

FILE CONTEXT:
${fileContext}

CONVERSATION:
${historyText}

Assistant:
  `.trim();
}

/**
 * Generate a chat response for the assistant UI.
 */
export async function generateChatResponse(context: ChatContext): Promise<string> {
  try {
    if (!GOOGLE_API_KEY) {
      throw new Error('Missing GOOGLE_API_KEY');
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    const prompt = buildChatPrompt(context);

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512,
      },
    });

    const response = await result.response;
    const text = response.text().trim();

    return text.length > 0 ? text : 'I am ready to help. What would you like me to do?';
  } catch (error) {
    console.error('❌ Gemini chat error:', error);
    throw error;
  }
}

/**
 * Generate CFO recommendation using Gemini
 * Analyzes invoice data and security scan to provide recommendation
 */
export async function generateCFORecommendation(
  invoiceData: InvoiceData,
  securityScan: {
    riskScore: number;
    isContract: boolean;
    isVerified: boolean;
    warnings: string[];
  },
  paymentPlan?: PaymentPlan | null
): Promise<{
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  summary: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  details: string[];
}> {
  try {
    console.log('🤖 Generating CFO recommendation...');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const paymentContext = paymentPlan
      ? `
      PAYMENT PLAN:
      - Payer: ${paymentPlan.payerAddress}
      - Method: ${paymentPlan.method}
      - Status: ${paymentPlan.status}
      - Invoice Amount (USDC base units): ${paymentPlan.invoiceAmountUSDC ?? 'N/A'}
      - USDC Balance: ${paymentPlan.usdcBalance ?? 'N/A'}
      - ETH Balance (wei): ${paymentPlan.ethBalanceWei ?? 'N/A'}
      - Max ETH In (wei): ${paymentPlan.maxEthInWei ?? 'N/A'}
      - Reason: ${paymentPlan.reason ?? 'N/A'}
      `
      : '';

    const prompt = `
      You are a CFO assistant analyzing a payment request.
      
      INVOICE DATA:
      - Wallet: ${invoiceData.walletAddress}
      - Amount: ${invoiceData.amount}
      - Recipient: ${invoiceData.recipient}
      - Purpose: ${invoiceData.purpose}
      
      SECURITY SCAN:
      - Risk Score: ${securityScan.riskScore}/100
      - Is Contract: ${securityScan.isContract ? 'Yes' : 'No'}
      - Contract Verified: ${securityScan.isVerified ? 'Yes' : 'No'}
      - Warnings: ${securityScan.warnings.join(', ') || 'None'}
      
      ${paymentContext}

      RISK THRESHOLDS:
      - 0-39: LOW risk (APPROVE)
      - 40-69: MEDIUM risk (REVIEW)
      - 70+: HIGH risk (REJECT)
      
      Provide a recommendation and brief analysis.
      Return ONLY a JSON object:
      {
        "recommendation": "APPROVE|REVIEW|REJECT",
        "summary": "One sentence summary",
        "riskLevel": "LOW|MEDIUM|HIGH",
        "details": ["Point 1", "Point 2", "Point 3"]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse recommendation');
    }

    const recommendation = JSON.parse(jsonMatch[0]);

    console.log('✅ Recommendation generated:', recommendation.recommendation);

    return {
      recommendation: recommendation.recommendation,
      summary: recommendation.summary,
      riskLevel: recommendation.riskLevel,
      details: recommendation.details,
    };

  } catch (error) {
    console.error('❌ Recommendation generation error:', error);
    
    // Fallback based on risk score
    if (securityScan.riskScore >= 70) {
      return {
        recommendation: 'REJECT',
        summary: 'High risk detected - automatic rejection',
        riskLevel: 'HIGH',
        details: ['Risk score exceeds 70 threshold', ...securityScan.warnings],
      };
    } else if (securityScan.riskScore >= 40) {
      return {
        recommendation: 'REVIEW',
        summary: 'Medium risk - manual review recommended',
        riskLevel: 'MEDIUM',
        details: ['Risk score between 40-69', ...securityScan.warnings],
      };
    } else {
      return {
        recommendation: 'APPROVE',
        summary: 'Low risk - safe to proceed',
        riskLevel: 'LOW',
        details: ['Risk score below 40', 'No major concerns detected'],
      };
    }
  }
}

/**
 * Stream invoice extraction with real LLM reasoning
 * Yields text chunks as the LLM thinks through the extraction
 */
export async function* streamInvoiceExtraction(
  pdfBuffer: Buffer,
  fileName: string
): AsyncGenerator<{ type: 'reasoning' | 'result'; content: string | InvoiceData }> {
  console.log(`📄 Streaming PDF extraction: ${fileName}`);

  const base64PDF = pdfBuffer.toString('base64');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
  });

  const streamingPrompt = `You are a CFO assistant analyzing an invoice PDF.

Think out loud as you extract the following information:
1. Wallet Address (Ethereum 0x...)
2. Amount with currency
3. Recipient/vendor name
4. Payment purpose

First, describe what you see in the document as you scan it. Share your reasoning process.
Then at the very end, output ONLY a JSON block with:
\`\`\`json
{
  "walletAddress": "0x...",
  "amount": "...",
  "recipient": "...",
  "purpose": "..."
}
\`\`\``;

  const result = await model.generateContentStream({
    contents: [
      {
        role: 'user',
        parts: [
          { text: streamingPrompt },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64PDF,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  let fullText = '';

  for await (const chunk of result.stream) {
    const text = chunk.text();
    fullText += text;
    yield { type: 'reasoning', content: text };
  }

  // Extract JSON from the full response
  const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/) || fullText.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const extractedData = JSON.parse(jsonStr);
      
      const invoiceData: InvoiceData = {
        walletAddress: extractedData.walletAddress || 'NOT_FOUND',
        amount: extractedData.amount || 'NOT_FOUND',
        recipient: extractedData.recipient || 'NOT_FOUND',
        purpose: extractedData.purpose || 'NOT_FOUND',
      };

      yield { type: 'result', content: invoiceData };
    } catch {
      throw new Error('Failed to parse invoice data from LLM response');
    }
  } else {
    throw new Error('No JSON found in LLM response');
  }
}

/**
 * Stream CFO recommendation with real LLM reasoning
 * Yields text chunks as the LLM analyzes and decides
 */
export async function* streamCFORecommendation(
  invoiceData: InvoiceData,
  securityScan: {
    riskScore: number;
    isContract: boolean;
    isVerified: boolean;
    warnings: string[];
  },
  paymentPlan?: PaymentPlan | null
): AsyncGenerator<{ type: 'reasoning' | 'result'; content: string | CFORecommendation }> {
  console.log('🤖 Streaming CFO recommendation...');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
  });

  const paymentContext = paymentPlan
    ? `\nPAYMENT PLAN:\n- Payer: ${paymentPlan.payerAddress}\n- Method: ${paymentPlan.method}\n- Status: ${paymentPlan.status}\n- Invoice Amount (USDC base units): ${paymentPlan.invoiceAmountUSDC ?? 'N/A'}\n- USDC Balance: ${paymentPlan.usdcBalance ?? 'N/A'}\n- ETH Balance (wei): ${paymentPlan.ethBalanceWei ?? 'N/A'}\n- Max ETH In (wei): ${paymentPlan.maxEthInWei ?? 'N/A'}\n- Reason: ${paymentPlan.reason ?? 'N/A'}\n`
    : '';

  const streamingPrompt = `You are a CFO assistant making a payment decision.

INVOICE DATA:
- Wallet: ${invoiceData.walletAddress}
- Amount: ${invoiceData.amount}
- Recipient: ${invoiceData.recipient}
- Purpose: ${invoiceData.purpose}

SECURITY SCAN RESULTS:
- Risk Score: ${securityScan.riskScore}/100
- Is Smart Contract: ${securityScan.isContract ? 'Yes' : 'No'}
- Contract Verified: ${securityScan.isVerified ? 'Yes' : 'No'}
- Warnings: ${securityScan.warnings.length > 0 ? securityScan.warnings.join(', ') : 'None'}
${paymentContext}

DECISION THRESHOLDS:
- 0-39: LOW risk → APPROVE
- 40-69: MEDIUM risk → REVIEW  
- 70+: HIGH risk → REJECT

Think through your analysis step by step. Consider:
1. The payment amount and recipient legitimacy
2. The wallet's security profile and any red flags
3. Whether the purpose aligns with expected vendor payments

Share your reasoning process, then conclude with:
\`\`\`json
{
  "recommendation": "APPROVE|REVIEW|REJECT",
  "summary": "One sentence summary",
  "riskLevel": "LOW|MEDIUM|HIGH",
  "details": ["Key point 1", "Key point 2", "Key point 3"]
}
\`\`\``;

  const result = await model.generateContentStream(streamingPrompt);

  let fullText = '';

  for await (const chunk of result.stream) {
    const text = chunk.text();
    fullText += text;
    yield { type: 'reasoning', content: text };
  }

  // Extract JSON from the full response
  const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/) || fullText.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const recommendation = JSON.parse(jsonStr);

      const result: CFORecommendation = {
        recommendation: recommendation.recommendation,
        summary: recommendation.summary,
        riskLevel: recommendation.riskLevel,
        details: recommendation.details || [],
      };

      yield { type: 'result', content: result };
    } catch {
      // Fallback based on risk
      const fallback: CFORecommendation = {
        recommendation: securityScan.riskScore >= 70 ? 'REJECT' : securityScan.riskScore >= 40 ? 'REVIEW' : 'APPROVE',
        summary: 'Analysis complete',
        riskLevel: securityScan.riskScore >= 70 ? 'HIGH' : securityScan.riskScore >= 40 ? 'MEDIUM' : 'LOW',
        details: ['Based on security scan results'],
      };
      yield { type: 'result', content: fallback };
    }
  }
}

// Type for CFO Recommendation (needed for streaming function)
interface CFORecommendation {
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
  summary: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  details: string[];
}
