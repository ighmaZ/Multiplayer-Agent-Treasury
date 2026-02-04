// lib/services/geminiService.ts
// Google Gemini integration for PDF invoice extraction

import { GoogleGenerativeAI } from '@google/generative-ai';
import { InvoiceData } from '@/app/types';

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
      model: 'gemini-2.0-flash-exp',
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
  }
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
