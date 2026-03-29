import { transliterateName } from './transliterate';

export interface ExtractedVoter {
  serialNumber: number;
  voterId: string;
  nameMl: string;
  nameEn: string;
  guardianNameMl: string;
  guardianNameEn: string;
  guardianRelation: string;
  houseNumber: string;
  houseNameMl: string;
  houseNameEn: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
}

export interface ExtractionProgress {
  stage: 'loading' | 'extracting' | 'parsing' | 'transliterating' | 'done' | 'error' | 'initializing_ocr' | 'scanning_image';
  fileIndex?: number;
  totalFiles?: number;
  currentPage?: number;
  totalPages?: number;
  votersFound?: number;
  message?: string;
  ocrProgress?: number;
}

// Malayalam keywords for relationship detection
export const RELATION_PATTERNS = {
  father: [
    'പിതാവിന്റെ പേര്', 'പിതാവ്', 'അച്ഛന്റെ പേര്', 'അച്ഛൻ',
    'Father', 'father'
  ],
  mother: [
    'മാതാവിന്റെ പേര്', 'മാതാവ്', 'അമ്മയുടെ പേര്', 'അമ്മ',
    'Mother', 'mother'
  ],
  husband: [
    'ഭർത്താവിന്റെ പേര്', 'ഭർത്താവ്', 'ഭര്‍ത്താവിന്റെ',
    'Husband', 'husband'
  ],
  wife: [
    'ഭാര്യയുടെ പേര്', 'ഭാര്യ',
    'Wife', 'wife'
  ],
};

// Malayalam sex keywords
export const SEX_PATTERNS = {
  male: ['പുരുഷൻ', 'പുരുഷന്‍', 'പു', 'Male', 'male', 'M'],
  female: ['സ്ത്രീ', 'സ്‌ത്രീ', 'സ്ത', 'Female', 'female', 'F'],
};

// Kerala voter ID pattern
export const VOTER_ID_REGEX = /[A-Z]{2,3}\d{6,7}/;

/**
 * Detect relation from text
 */
export function detectRelation(text: string): string {
  const lower = text;
  for (const [relation, patterns] of Object.entries(RELATION_PATTERNS)) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        return relation.charAt(0).toUpperCase() + relation.slice(1);
      }
    }
  }
  return 'Guardian';
}

/**
 * Detect gender from text
 */
export function detectGender(text: string): 'Male' | 'Female' | 'Other' {
  for (const pattern of SEX_PATTERNS.female) {
    if (text.includes(pattern)) return 'Female';
  }
  for (const pattern of SEX_PATTERNS.male) {
    if (text.includes(pattern)) return 'Male';
  }
  return 'Other';
}

/**
 * Check if text contains Malayalam characters
 */
export function isMalayalam(text: string): boolean {
  return /[\u0D00-\u0D7F]/.test(text);
}

/**
 * Extract age from text — looks for numbers between 18-120
 */
export function extractAge(text: string): number {
  const matches = text.match(/\d+/g);
  if (matches) {
    for (const m of matches) {
      const n = parseInt(m);
      if (n >= 18 && n <= 120) return n;
    }
  }
  return 0;
}

/**
 * Parse voter entries from flattened text lines.
 * This handles the standard Kerala Election Commission voter list format.
 * Expects colLines to be an array of arrays, where each inner array is a vertical column of lines.
 */
export function parseVoterEntries(colLines: string[][]): ExtractedVoter[] {
  const voters: ExtractedVoter[] = [];
  
  for (const lines of colLines) {
    let currentVoter: Partial<ExtractedVoter> = {};
    
    for (let i = 0; i < lines.length; i++) {
      // Core sanitization: strip out vertical bars, brackets, and boilerplate photo text that OCR often merges
      let line = lines[i].replace(/[|\[\]\\]/g, '').replace(/(ഫോട്ടോ|ലഭ്യമല്ല|ലഭ്യമാണ്|Photo|Available|Not)/gi, '').trim();
      
      if (!line) continue;
      
      const compactLine = line.replace(/\s+/g, ''); // Removes spaces to match ID robustly
      
      // Check for Serial Number + Voter ID in the same line
      const idMatch = compactLine.match(/[A-Z]{2,3}\d{6,7}/);
      
      // Detect Name label which is a strictly reliable delimiter for a new voter box
      const isNameLabel = line.match(/^(പേര്|പേര)\s*[:\-]?\s*(.*)/i) && !line.includes('അച്ഛ') && !line.includes('ഭർത്താ') && !line.includes('മാതാ') && !line.includes('ഭാര്യ');

      if (idMatch && compactLine.length < 25) { // Keep it tight to avoid matching huge broken lines
        // If we already have a reasonably populated voter, save it before starting new one
        if (currentVoter.voterId && (currentVoter.nameMl || currentVoter.age)) {
          voters.push(currentVoter as ExtractedVoter);
        }
        
        currentVoter = {
          voterId: idMatch[0],
          nameMl: '',
          guardianNameMl: '',
          guardianRelation: 'Guardian',
          houseNumber: '',
          houseNameMl: '',
          nameEn: '',
          guardianNameEn: '',
          houseNameEn: '',
          age: 0,
          gender: 'Other',
          serialNumber: 0
        };
        
        // Extract serial number which normally precedes Voter ID, accommodating '#' mark
        const serialMatch = line.match(/^[#*\s]*(\d{1,4})\s/);
        if (serialMatch) {
          currentVoter.serialNumber = parseInt(serialMatch[1]);
        }
        continue;
      } else if (isNameLabel && (currentVoter.nameMl || currentVoter.voterId)) {
        // Fallback: If OCR mangled the Voter ID so idMatch failed, but we found a new "പേര് :" while already having a name!
        // This solves the 'merging 30 boxes into 1' bug.
        voters.push(currentVoter as ExtractedVoter);
        currentVoter = {
          voterId: 'OCR-ERROR', 
          nameMl: '',
          guardianNameMl: '',
          guardianRelation: 'Guardian',
          houseNumber: '',
          houseNameMl: '',
          nameEn: '',
          guardianNameEn: '',
          houseNameEn: '',
          age: 0,
          gender: 'Other',
          serialNumber: 0
        };
      }
      
      // If we are tracking a voter, look for specific field labels
      if (currentVoter.voterId || currentVoter.voterId === undefined) {
        // Label: Name  (പേര്)
        if (isNameLabel) {
          currentVoter.nameMl = line.replace(/^(പേര്|പേര)\s*[:\-]?\s*/i, '').trim();
          continue;
        }
        
        // Label: Guardian Name (അച്ഛന്റെ പേര് / ഭർത്താവിന്റെ പേര് / അമ്മയുടെ പേര് / ഭാര്യയുടെ പേര് / മറ്റുള്ളവർ)
        if (line.match(/^(അച്ഛ|മാതാ|ഭർത്താ|ഭാര്യ|രക്ഷി|മറ്റു)/)) {
          currentVoter.guardianRelation = detectRelation(line);
          currentVoter.guardianNameMl = line.replace(/^.*?പേര്\s*[:\-]?\s*/, '').replace(/^മറ്റുള്ളവർ\s*[:\-]?\s*/, '').trim();
          continue;
        }
        
        // Label: House Details (വീട്ടു നമ്പർ)
        if (line.match(/^വീട്ടു/)) {
          let houseRaw = line.replace(/^വീട്ടു\s*നമ്പർ\s*[:\-]?\s*/, '').trim();
          
          // Format is typically: "WARD/HOUSENUMBER MODIFIER, HOUSENAME"
          // e.g. "17/712 എ1, പൂററൻകുന്ന്" -> Number: 712, Name: പൂററൻകുന്ന്
          
          if (houseRaw.includes(',')) {
             const parts = houseRaw.split(',');
             currentVoter.houseNameMl = parts.slice(1).join(',').trim();
             
             const numberSection = parts[0].trim();
             const afterSlash = numberSection.split('/').pop() || numberSection; // Strip ward number "17/"
             const coreDigitMatch = afterSlash.match(/^(\d+)/);                  // Strip modifier "എ1"
             currentVoter.houseNumber = coreDigitMatch ? coreDigitMatch[1] : numberSection;
          } else {
             // Fallback if no comma: separate numeric prefix from remaining malayalam text
             currentVoter.houseNameMl = houseRaw.replace(/^[\d/A-Za-z\s]+/, '').trim() || houseRaw;
             
             const numberSection = houseRaw.split(' ')[0] || houseRaw;
             const afterSlash = numberSection.split('/').pop() || numberSection;
             const coreDigitMatch = afterSlash.match(/^(\d+)/);
             currentVoter.houseNumber = coreDigitMatch ? coreDigitMatch[1] : numberSection;
          }
          continue;
        }
        
        // Label: Age & Sex (പ്രായം : 64 ലിംഗം : സ്ത്രീ)
        if (line.includes('പ്രായം')) {
          currentVoter.age = extractAge(line);
          currentVoter.gender = detectGender(line);
          continue;
        }
        
        // Sometimes lines wrap around (e.g. long house name or long person name)
        // If we find unlabelled text, append it to the last active field
        if (isMalayalam(line)) {
          if (!currentVoter.nameMl) {
             currentVoter.nameMl = line;
          } else if (!currentVoter.guardianNameMl) {
             currentVoter.guardianNameMl = line;
          } else if (!currentVoter.houseNameMl && !line.includes('പ്രായം')) {
             currentVoter.houseNameMl = line;
          }
        }
      }
    }
    
    // Push the very last voter in the column
    if (currentVoter.voterId && (currentVoter.nameMl || currentVoter.age)) {
      voters.push(currentVoter as ExtractedVoter);
    }
  }

  // If serial numbers weren't found, assign them sequentially
  if (voters.length > 0 && voters.every(v => v.serialNumber === 0)) {
    voters.forEach((v, idx) => v.serialNumber = idx + 1);
  }

  return voters;
}
