/**
 * Malayalam → English Transliteration Engine
 * Client-side Unicode character mapping — no API key needed.
 */

const VOWELS: Record<string, string> = {
  '\u0D05': 'a', '\u0D06': 'aa', '\u0D07': 'i', '\u0D08': 'ee',
  '\u0D09': 'u', '\u0D0A': 'oo', '\u0D0B': 'ru', '\u0D0E': 'e',
  '\u0D0F': 'e', '\u0D10': 'ai', '\u0D12': 'o', '\u0D13': 'o',
  '\u0D14': 'au',
};

const VOWEL_SIGNS: Record<string, string> = {
  '\u0D3E': 'aa', '\u0D3F': 'i', '\u0D40': 'ee', '\u0D41': 'u',
  '\u0D42': 'oo', '\u0D43': 'ru', '\u0D46': 'e', '\u0D47': 'e',
  '\u0D48': 'ai', '\u0D4A': 'o', '\u0D4B': 'o', '\u0D4C': 'au',
};

const CONSONANTS: Record<string, string> = {
  '\u0D15': 'ka', '\u0D16': 'kha', '\u0D17': 'ga', '\u0D18': 'gha', '\u0D19': 'nga',
  '\u0D1A': 'cha', '\u0D1B': 'chha', '\u0D1C': 'ja', '\u0D1D': 'jha', '\u0D1E': 'nja',
  '\u0D1F': 'ta', '\u0D20': 'tta', '\u0D21': 'da', '\u0D22': 'dda', '\u0D23': 'na',
  '\u0D24': 'tha', '\u0D25': 'thha', '\u0D26': 'da', '\u0D27': 'dha', '\u0D28': 'na',
  '\u0D2A': 'pa', '\u0D2B': 'pha', '\u0D2C': 'ba', '\u0D2D': 'bha', '\u0D2E': 'ma',
  '\u0D2F': 'ya', '\u0D30': 'ra', '\u0D31': 'ra', '\u0D32': 'la', '\u0D33': 'la',
  '\u0D34': 'zha', '\u0D35': 'va', '\u0D36': 'sha', '\u0D37': 'sha', '\u0D38': 'sa',
  '\u0D39': 'ha', '\u0D3A': 'tra',
};

const CONSONANT_BASES: Record<string, string> = {};
for (const [k, v] of Object.entries(CONSONANTS)) {
  // Strip trailing 'a' to get the base consonant sound
  CONSONANT_BASES[k] = v.endsWith('a') && v.length > 1 ? v.slice(0, -1) : v;
}

const VIRAMA = '\u0D4D'; // ്  (chandrakkala / halant)
const ANUSVARA = '\u0D02'; // ം
const VISARGA = '\u0D03'; // ഃ
const CHILLU_MAP: Record<string, string> = {
  '\u0D7A': 'n', '\u0D7B': 'n', '\u0D7C': 'r', '\u0D7D': 'l',
  '\u0D7E': 'l', '\u0D7F': 'k',
};

// Malayalam numerals
const NUMERALS: Record<string, string> = {
  '\u0D66': '0', '\u0D67': '1', '\u0D68': '2', '\u0D69': '3', '\u0D6A': '4',
  '\u0D6B': '5', '\u0D6C': '6', '\u0D6D': '7', '\u0D6E': '8', '\u0D6F': '9',
};

export function transliterateMalayalam(text: string): string {
  if (!text) return '';
  
  let result = '';
  const chars = [...text]; // Handle surrogate pairs properly
  let i = 0;
  
  while (i < chars.length) {
    const ch = chars[i];
    const next = i + 1 < chars.length ? chars[i + 1] : '';
    
    // Malayalam numeral
    if (NUMERALS[ch]) {
      result += NUMERALS[ch];
      i++;
      continue;
    }
    
    // Chillu characters (standalone consonant forms)
    if (CHILLU_MAP[ch]) {
      result += CHILLU_MAP[ch];
      i++;
      continue;
    }
    
    // Anusvara (ം) → 'm'
    if (ch === ANUSVARA) {
      result += 'm';
      i++;
      continue;
    }
    
    // Visarga (ഃ) → 'h'
    if (ch === VISARGA) {
      result += 'h';
      i++;
      continue;
    }
    
    // Independent vowels
    if (VOWELS[ch]) {
      result += VOWELS[ch];
      i++;
      continue;
    }
    
    // Consonant
    if (CONSONANTS[ch]) {
      if (next === VIRAMA) {
        // Consonant + virama: check if conjunct or dead consonant
        const afterVirama = i + 2 < chars.length ? chars[i + 2] : '';
        if (CONSONANTS[afterVirama]) {
          // Conjunct: output base consonant, skip virama
          result += CONSONANT_BASES[ch];
          i += 2; // skip consonant + virama, let next consonant process
          continue;
        } else {
          // Dead consonant (end of syllable)
          result += CONSONANT_BASES[ch];
          i += 2;
          continue;
        }
      } else if (VOWEL_SIGNS[next]) {
        // Consonant + vowel sign
        result += CONSONANT_BASES[ch] + VOWEL_SIGNS[next];
        i += 2;
        continue;
      } else {
        // Consonant with inherent 'a'
        result += CONSONANTS[ch];
        i++;
        continue;
      }
    }
    
    // Vowel signs appearing independently (shouldn't happen but handle)
    if (VOWEL_SIGNS[ch]) {
      result += VOWEL_SIGNS[ch];
      i++;
      continue;
    }
    
    // Virama appearing standalone
    if (ch === VIRAMA) {
      i++;
      continue;
    }
    
    // Pass through non-Malayalam characters
    result += ch;
    i++;
  }
  
  return result;
}

/**
 * Capitalize the first letter of each word in a transliterated name
 */
export function capitalizeName(name: string): string {
  return name
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Transliterate and capitalize a Malayalam name
 */
export function transliterateName(malayalamName: string): string {
  if (!malayalamName) return '';
  const transliterated = transliterateMalayalam(malayalamName.trim());
  return capitalizeName(transliterated);
}
