// lib/services/pdfService.ts
// PDF processing utilities

/**
 * Convert PDF buffer to text (fallback method)
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Dynamic import to handle ESM/CJS compatibility
    const pdfParse = await import('pdf-parse');
    const pdfModule = pdfParse as any;
    const data = await (pdfModule.default || pdfModule)(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('❌ PDF text extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Validate PDF file
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'File must be a PDF' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  // Check file size (min 1KB)
  if (file.size < 1024) {
    return { valid: false, error: 'File is too small or empty' };
  }

  return { valid: true };
}

/**
 * Convert File to Buffer
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
