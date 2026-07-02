import type { GenerationSessionState } from '@/app/generation-preview/types';
import { MAX_PDF_CONTENT_CHARS, MAX_VISION_IMAGES } from '@/lib/constants/generation';
import type { PdfImage } from '@/lib/types/generation';
import type { ParsedPdfContent } from '@/lib/types/pdf';
import { storeImages } from '@/lib/utils/image-storage';

type PdfImageSource = {
  id: string;
  src: string;
  pageNumber: number;
  description?: string;
  width?: number;
  height?: number;
};

function extractPdfImages(parsed: ParsedPdfContent): PdfImageSource[] {
  const rawPdfImages = parsed.metadata?.pdfImages;
  if (rawPdfImages?.length) {
    return rawPdfImages.map((img) => ({
      id: img.id,
      src: img.src || '',
      pageNumber: img.pageNumber || 1,
      description: img.description,
      width: img.width,
      height: img.height,
    }));
  }

  return (parsed.images ?? []).map((src, i) => ({
    id: `img_${i + 1}`,
    src,
    pageNumber: 1,
  }));
}

/**
 * Merge server-parsed PDF content into a generation session (images → IndexedDB).
 */
export async function attachParsedPdfToSession(
  session: GenerationSessionState,
  parsed: ParsedPdfContent,
): Promise<GenerationSessionState> {
  let pdfText = parsed.text ?? '';
  if (pdfText.length > MAX_PDF_CONTENT_CHARS) {
    pdfText = pdfText.substring(0, MAX_PDF_CONTENT_CHARS);
  }

  const images = extractPdfImages(parsed).filter((img) => img.src);
  const imageStorageIds = images.length > 0 ? await storeImages(images) : [];

  const pdfImages: PdfImage[] = images.map((img, i) => ({
    id: img.id,
    src: '',
    pageNumber: img.pageNumber,
    description: img.description,
    width: img.width,
    height: img.height,
    storageId: imageStorageIds[i],
  }));

  return {
    ...session,
    pdfText,
    pdfImages,
    imageStorageIds,
    pdfFileName: parsed.metadata?.fileName,
    pdfStorageKey: undefined,
  };
}

export function pdfTruncationWarnings(parsed: ParsedPdfContent): string[] {
  const warnings: string[] = [];
  if ((parsed.text ?? '').length > MAX_PDF_CONTENT_CHARS) {
    warnings.push(`PDF text truncated to ${MAX_PDF_CONTENT_CHARS} characters`);
  }
  const imageCount = extractPdfImages(parsed).length;
  if (imageCount > MAX_VISION_IMAGES) {
    warnings.push(`Only the first ${MAX_VISION_IMAGES} PDF images are used for vision`);
  }
  return warnings;
}
