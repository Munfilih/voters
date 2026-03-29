/**
 * PDF Voter List Extractor
 * Parses Kerala Election Commission standard voter list PDFs.
 * 
 * Each voter entry in the PDF is a "box" containing:
 * - Serial Number (starting from 1)
 * - Voter ID (e.g. KRL1234567)
 * - Voter Name (Malayalam)
 * - Guardian Name with relationship (Father/Mother/Husband/Wife)
 * - House Number + House Name
 * - Age and Sex
 */

import * as pdfjsLib from 'pdfjs-dist';
import { transliterateName } from './transliterate';
import { 
  ExtractionProgress, ExtractedVoter, parseVoterEntries 
} from './voterParserUtils';

// Configure the worker — use local package file via Vite URL import
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

/**
 * Extract raw text lines from PDF for debugging/preview
 */
export async function extractRawTextFromPdf(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allLines: string[] = [];
  const rawDebugItems: any[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const colWidth = viewport.width / 3;
    
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];
    
    if (pageNum === 1) {
      // Save the first 20 items of the first page exactly as the parser sees them
      rawDebugItems.push(...items.slice(0, 20));
    }
    
    // Group items into 3 columns based on X coordinate
    const cols: any[][] = [[], [], []];

    for (const item of items) {
      // Don't skip empty items for debugging if we need them, but we still skip for extraction
      if (!item.str || item.str.trim() === '') continue;
      
      const x = item.transform ? item.transform[4] : 0;
      if (x < colWidth) cols[0].push(item);
      else if (x < colWidth * 2) cols[1].push(item);
      else cols[2].push(item);
    }

    // Process each column top-to-bottom
    for (let colIdx = 0; colIdx < 3; colIdx++) {
      const colItems = cols[colIdx];
      const lines: { y: number; texts: { x: number; str: string }[] }[] = [];
      
      for (const item of colItems) {
        const y = item.transform ? Math.round(item.transform[5]) : 0;
        const x = item.transform ? Math.round(item.transform[4]) : 0;
        let line = lines.find(l => Math.abs(l.y - y) < 5);
        if (!line) {
          line = { y, texts: [] };
          lines.push(line);
        }
        line.texts.push({ x, str: item.str });
      }

      lines.sort((a, b) => b.y - a.y);
      for (const line of lines) {
        line.texts.sort((a, b) => a.x - b.x);
        const text = line.texts.map(t => t.str).join(' ').trim();
        if (text) allLines.push(text);
      }
    }
  }

  // If we couldn't extract any structured lines, dump the raw JSON debug info
  if (allLines.length === 0) {
    if (rawDebugItems.length === 0) {
      return ["DEBUG: The PDF text layer is completely empty.", "This PDF might be a scanned image containing no text, or it uses paths instead of fonts."];
    }
    return [
      "DEBUG: PDF contains text items, but structured extraction failed.",
      "First 20 raw items from the PDF library:",
      JSON.stringify(rawDebugItems, null, 2)
    ];
  }

  return allLines;
}

/**
 * Main extraction function: reads a PDF file and extracts voter entries
 */
export async function extractVotersFromPdf(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedVoter[]> {
  onProgress?.({ stage: 'loading', message: 'Loading PDF file...' });

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  onProgress?.({ stage: 'extracting', totalPages, currentPage: 0, message: `Extracting text from ${totalPages} pages...` });

  // Collect all text from all pages
  const allPageTexts: string[][] = [];
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({ stage: 'extracting', totalPages, currentPage: pageNum, message: `Reading page ${pageNum} of ${totalPages}...` });
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const colWidth = viewport.width / 3;

    const textContent = await page.getTextContent();
    const items = textContent.items as any[];
    
    // Group into 3 columns
    const cols: any[][] = [[], [], []];
    for (const item of items) {
      if (!item.str || item.str.trim() === '') continue;
      const x = item.transform[4];
      if (x < colWidth) cols[0].push(item);
      else if (x < colWidth * 2) cols[1].push(item);
      else cols[2].push(item);
    }
    
    // Process each column sequentially (top to bottom)
    for (let colIdx = 0; colIdx < 3; colIdx++) {
      const colItems = cols[colIdx];
      const lines: { y: number; texts: { x: number; str: string }[] }[] = [];
      
      for (const item of colItems) {
        const y = Math.round(item.transform[5]);
        const x = Math.round(item.transform[4]);
        let line = lines.find(l => Math.abs(l.y - y) < 5);
        if (!line) {
          line = { y, texts: [] };
          lines.push(line);
        }
        line.texts.push({ x, str: item.str });
      }
      
      lines.sort((a, b) => b.y - a.y);
      
      const colLines = lines.map(line => {
        line.texts.sort((a, b) => a.x - b.x);
        return line.texts.map(t => t.str).join(' ').trim();
      }).filter(text => text.length > 0);
      
      allPageTexts.push(colLines);
    }
  }

  onProgress?.({ stage: 'parsing', message: 'Parsing voter entries...' });

  // Parse voters from text (pass the unflattened array of column lines)
  const voters = parseVoterEntries(allPageTexts);

  onProgress?.({ stage: 'transliterating', votersFound: voters.length, message: `Transliterating ${voters.length} voter records...` });

  // Transliterate Malayalam text to English
  const transliteratedVoters = voters.map(v => ({
    ...v,
    nameEn: v.nameMl ? transliterateName(v.nameMl) : '',
    guardianNameEn: v.guardianNameMl ? transliterateName(v.guardianNameMl) : '',
    houseNameEn: v.houseNameMl ? transliterateName(v.houseNameMl) : '',
  }));

  onProgress?.({ stage: 'done', votersFound: transliteratedVoters.length, message: `Successfully extracted ${transliteratedVoters.length} voters.` });

  return transliteratedVoters;
}

export type { ExtractedVoter, ExtractionProgress } from './voterParserUtils';
