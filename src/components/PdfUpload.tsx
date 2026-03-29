import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, Upload, CheckCircle2, AlertTriangle, X, Loader2, 
  FileText, Users, Building2, Pencil, ChevronDown, ChevronUp,
  RefreshCw, Trash2
} from 'lucide-react';
import { auth, db, collection, doc, setDoc, getDocs, query, where } from '../firebase';
import { Voter, House } from '../types';
import { extractVotersFromPdf, extractRawTextFromPdf } from '../lib/pdfVoterExtractor';
import { extractVotersFromImage } from '../lib/geminiVoterExtractor';
import { ExtractedVoter, ExtractionProgress } from '../lib/voterParserUtils';

interface PdfUploadProps {
  boothId: string;
  voters: Voter[];
  houses: House[];
  onSuccess: () => void;
}

const inputClasses = 'w-full px-3 py-2 bg-[#f5f5f0] rounded-xl border border-transparent focus:border-[#5A5A40]/30 focus:outline-none focus:ring-0 font-sans text-sm transition-colors';

export default function PdfUpload({ boothId, voters, houses, onSuccess }: PdfUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [extractedVoters, setExtractedVoters] = useState<ExtractedVoter[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ saved: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'overwrite'>('skip');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawTextLines, setRawTextLines] = useState<string[]>([]);
  const [showRawText, setShowRawText] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);
  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem('geminiApiKey') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files as Iterable<File>).filter(f => 
      f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles);
      setExtractionDone(false);
      setError(null);
    } else {
      setError('Please drop valid PDF or Image files.');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files as Iterable<File>).filter(f => 
        f.type === 'application/pdf' || f.type.startsWith('image/')
      );
      if (selectedFiles.length > 0) {
        setFiles(selectedFiles);
        setExtractionDone(false);
        setError(null);
      } else {
        setError('No valid PDF or Image files found in the selection.');
      }
    }
  }, []);

  // Auto-extract when files are selected
  useEffect(() => {
    if (files.length > 0 && !extractionDone) {
      handleExtract();
    }
  }, [files]);

  const handleExtract = async () => {
    if (files.length === 0) return;
    setError(null);
    setExtractedVoters([]);
    setRawTextLines([]);
    setExtractionDone(false);
    setShowRawText(false);
    
    let allVoters: ExtractedVoter[] = [];
    let savedRawLines: string[] = [];
    
    // Validate API Key for Images
    if (files.some(f => f.type.startsWith('image/')) && !geminiKey) {
      setError("Please paste your Gemini API Key in the settings field below first to extract images.");
      setExtractionDone(true);
      return;
    }
    
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        if (f.type === 'application/pdf') {
          if (files.length === 1) { // Only save debug raw text if single file
            const rawLines = await extractRawTextFromPdf(f);
            savedRawLines = rawLines;
          }
          const result = await extractVotersFromPdf(f, (p) => setProgress({ ...p, fileIndex: i + 1, totalFiles: files.length }));
          allVoters = [...allVoters, ...result];
        } else if (f.type.startsWith('image/')) {
          const result = await extractVotersFromImage(f, geminiKey, (p) => setProgress({ ...p, fileIndex: i + 1, totalFiles: files.length }));
          allVoters = [...allVoters, ...result];
        }
      } catch (err: any) {
        console.error(`Extraction error on ${f.name}:`, err);
        if (files.length === 1) {
          setError(`Failed to extract voters: ${err.message || 'Unknown error'}`);
          setProgress({ stage: 'error', message: err.message });
          setExtractionDone(true);
          return;
        }
      }
    }

    setExtractedVoters(allVoters);
    setExtractionDone(true);
    
    if (files.length === 1 && allVoters.length === 0 && savedRawLines.length > 0) {
      setRawTextLines(savedRawLines);
      setShowRawText(true);
    }
  };

  const handleEditVoter = (index: number, field: keyof ExtractedVoter, value: any) => {
    setExtractedVoters(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteVoter = (index: number) => {
    setExtractedVoters(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveToFirestore = async () => {
    if (!auth.currentUser || extractedVoters.length === 0) return;
    setSaving(true);
    setSaveProgress({ saved: 0, total: extractedVoters.length });

    try {
      const existingVoterIds = new Set(voters.map(v => v.voterId));
      const existingHouseNumbers = new Map(houses.map(h => [h.houseNumber, h]));
      const newHouses = new Map<string, { name: string; nameMl: string }>();

      let savedCount = 0;
      let skippedCount = 0;

      for (const ev of extractedVoters) {
        // Check for duplicates
        if (existingVoterIds.has(ev.voterId)) {
          if (duplicateAction === 'skip') {
            skippedCount++;
            savedCount++;
            setSaveProgress({ saved: savedCount, total: extractedVoters.length });
            continue;
          }
          // For overwrite, we proceed and update
        }

        // Create house if needed
        if (ev.houseNumber && !existingHouseNumbers.has(ev.houseNumber) && !newHouses.has(ev.houseNumber)) {
          newHouses.set(ev.houseNumber, {
            name: ev.houseNameEn || ev.houseNameMl || ev.houseNumber,
            nameMl: ev.houseNameMl,
          });
        }

        // Save voter
        const voterRef = ev.voterId && existingVoterIds.has(ev.voterId) && duplicateAction === 'overwrite'
          ? doc(db, 'voters', voters.find(v => v.voterId === ev.voterId)!.id)
          : doc(collection(db, 'voters'));
        
        const currentYear = new Date().getFullYear();
        const birthYear = ev.age ? currentYear - ev.age : undefined;
        
        await setDoc(voterRef, {
          id: voterRef.id,
          boothId,
          ownerId: auth.currentUser!.uid,
          serialNumber: ev.serialNumber,
          name: ev.nameEn || ev.nameMl,
          nameMl: ev.nameMl,
          age: ev.age || 0,
          birthYear,
          gender: ev.gender,
          voterId: ev.voterId,
          address: ev.houseNameEn || ev.houseNameMl || '',
          houseNumber: ev.houseNumber,
          guardianName: ev.guardianNameEn || ev.guardianNameMl,
          guardianNameMl: ev.guardianNameMl,
          guardianRelation: ev.guardianRelation,
          createdAt: new Date().toISOString(),
        });

        savedCount++;
        setSaveProgress({ saved: savedCount, total: extractedVoters.length });
      }

      // Create all new houses
      for (const [houseNum, houseData] of newHouses.entries()) {
        const houseRef = doc(collection(db, 'houses'));
        await setDoc(houseRef, {
          id: houseRef.id,
          boothId,
          ownerId: auth.currentUser!.uid,
          name: houseData.name,
          nameMl: houseData.nameMl,
          houseNumber: houseNum,
          createdAt: new Date().toISOString(),
        });
      }

      // Done — navigate back
      onSuccess();
    } catch (err: any) {
      console.error('Save error:', err);
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Summary stats
  const uniqueHouses = new Set(extractedVoters.filter(v => v.houseNumber).map(v => v.houseNumber));
  const newHouseCount = [...uniqueHouses].filter(h => !houses.find(eh => eh.houseNumber === h)).length;
  const duplicateCount = extractedVoters.filter(v => voters.find(ev => ev.voterId === v.voterId)).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl md:text-4xl font-sans font-semibold text-[#1a1a1a] mb-2">
            Import Voter List
          </h2>
          <p className="text-sm md:text-base text-[#5A5A40]/60 font-sans">
            Upload PDF files or folders containing image scans of the Kerala Election Commission Voter List. Extract data instantly.
          </p>
        </div>
      </header>
      
      {extractedVoters.length === 0 && (
        <div className="bg-[#5A5A40]/5 rounded-xl border border-[#5A5A40]/10 p-4 mb-4 flex flex-col md:flex-row items-center gap-4">
          <label className="text-sm font-semibold text-[#5A5A40] whitespace-nowrap">Gemini API Key:</label>
          <input 
            type="password"
            value={geminiKey}
            onChange={(e) => {
              setGeminiKey(e.target.value);
              localStorage.setItem('geminiApiKey', e.target.value);
            }}
            placeholder="Required for processing image files (e.g. AIzaSy...)"
            className="flex-1 bg-white border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5A5A40]/40 transition-colors w-full"
          />
        </div>
      )}

      {/* Upload Zone */}
      {extractedVoters.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative bg-white rounded-[32px] border-2 border-dashed p-12 md:p-16 text-center
              ${files.length > 0 ? 'border-[#5A5A40]/40 bg-[#5A5A40]/5' : 'border-black/10'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            {/* Native folder selector */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              {files.length > 0 ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-[#5A5A40]" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-lg text-[#1a1a1a]">
                      {files.length} {files.length === 1 ? 'file' : 'files'} selected for import
                    </p>
                    <p className="text-sm text-[#5A5A40]/50 mt-1">
                      {(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFiles([]); setProgress(null); setExtractionDone(false); setRawTextLines([]); }}
                    className="text-xs text-[#5A5A40]/50 hover:text-red-500 transition-colors"
                  >
                    Clear selection
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#5A5A40]/10 to-[#5A5A40]/5 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-[#5A5A40]/40" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-lg text-[#1a1a1a]">
                      Drop PDFs or Images here
                    </p>
                    <p className="text-sm text-[#5A5A40]/50 mt-2 flex flex-wrap justify-center gap-2">
                      <span className="bg-[#5A5A40]/10 px-3 py-1 rounded-full text-xs font-bold text-[#5A5A40] hover:bg-[#5A5A40]/20 transition-colors" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                        Select Files
                      </span>
                      <span className="bg-[#5A5A40]/10 px-3 py-1 rounded-full text-xs font-bold text-[#5A5A40] hover:bg-[#5A5A40]/20 transition-colors" onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}>
                        Select Folder
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-red-50 text-red-600 px-6 py-4 rounded-2xl text-sm"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Options */}
          <div className="bg-white rounded-[24px] border border-black/5 p-6 space-y-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-bold text-[#5A5A40]/50 hover:text-[#5A5A40] transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Import Options
            </button>
            
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#5A5A40]/60 mb-2">
                    Duplicate Voter IDs
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDuplicateAction('skip')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        duplicateAction === 'skip' 
                          ? 'bg-[#5A5A40] text-white' 
                          : 'bg-[#f5f5f0] text-[#5A5A40]/50'
                      }`}
                    >
                      Skip Duplicates
                    </button>
                    <button
                      onClick={() => setDuplicateAction('overwrite')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        duplicateAction === 'overwrite' 
                          ? 'bg-[#5A5A40] text-white' 
                          : 'bg-[#f5f5f0] text-[#5A5A40]/50'
                      }`}
                    >
                      Overwrite Duplicates
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Progress */}
          {progress && progress.stage !== 'done' && progress.stage !== 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-[24px] border border-black/5 p-8 space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-[#5A5A40] animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="font-sans font-semibold text-[#1a1a1a]">{progress.message}</p>
                    {progress.totalFiles && progress.totalFiles > 1 && (
                      <span className="text-xs font-bold text-[#5A5A40]/50 bg-[#f5f5f0] px-2 py-0.5 rounded-lg">
                        File {progress.fileIndex} / {progress.totalFiles}
                      </span>
                    )}
                  </div>
                  
                  {progress.totalPages && (
                    <p className="text-xs text-[#5A5A40]/50">
                      Page {progress.currentPage} of {progress.totalPages}
                    </p>
                  )}
                </div>
              </div>
              
              {(progress.totalPages || progress.ocrProgress !== undefined) && (
                <div className="w-full bg-[#f5f5f0] rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-[#5A5A40] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: progress.ocrProgress !== undefined 
                        ? `${progress.ocrProgress * 100}%` 
                        : `${((progress.currentPage || 0) / (progress.totalPages || 1)) * 100}%` 
                    }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Extract Button — shown only if auto-extract failed */}
          {files.length > 0 && progress?.stage === 'error' && (
            <button
              onClick={handleExtract}
              className="w-full bg-[#5A5A40] hover:bg-[#4a4a30] text-white font-sans font-bold py-5 px-8 rounded-full transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <RefreshCw className="w-5 h-5" />
              Retry Extraction
            </button>
          )}
        </motion.div>
      )}

      {/* No Voters Found State */}
      {extractionDone && extractedVoters.length === 0 && !error && files.length === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-amber-50 rounded-[24px] border border-amber-200 p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-xl font-sans font-semibold text-amber-800">No Voters Found</h3>
            <p className="text-sm text-amber-700/70 max-w-md mx-auto">
              The PDF was read successfully but the parser couldn't identify voter entries. 
              This could mean the PDF format is different from the standard Kerala Election Commission layout.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => { setFiles([]); setProgress(null); setExtractionDone(false); setRawTextLines([]); }}
                className="px-6 py-3 rounded-full border border-amber-300 text-amber-700 font-sans text-sm font-bold hover:bg-amber-100 transition-colors"
              >
                Try Another File
              </button>
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="px-6 py-3 rounded-full bg-amber-500 text-white font-sans text-sm font-bold hover:bg-amber-600 transition-colors"
              >
                {showRawText ? 'Hide' : 'Show'} Raw PDF Text ({rawTextLines.length} lines)
              </button>
            </div>
          </div>

          {showRawText && rawTextLines.length > 0 && (
            <div className="bg-white rounded-[24px] border border-black/5 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5">
                <h3 className="font-sans font-semibold text-[#1a1a1a]">
                  Raw Extracted Text <span className="text-[#5A5A40]/40">({rawTextLines.length} lines)</span>
                </h3>
                <p className="text-xs text-[#5A5A40]/50 mt-1">
                  This is the raw text extracted from the PDF. Share this with the developer to improve parsing.
                </p>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-6">
                <pre className="text-xs font-mono text-[#1a1a1a] whitespace-pre-wrap leading-relaxed">
                  {rawTextLines.map((line, i) => (
                    <div key={i} className="flex gap-3 py-0.5 hover:bg-[#f5f5f0] rounded px-2">
                      <span className="text-[#5A5A40]/30 select-none min-w-[3rem] text-right">{i + 1}</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Preview Table */}
      {extractedVoters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#5A5A40]/50" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40">Voters</span>
              </div>
              <p className="text-2xl font-sans font-bold text-[#1a1a1a]">{extractedVoters.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-[#5A5A40]/50" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40">Houses</span>
              </div>
              <p className="text-2xl font-sans font-bold text-[#1a1a1a]">{uniqueHouses.size}</p>
              <p className="text-[10px] text-[#5A5A40]/50">{newHouseCount} new</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-amber-500/60" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40">Duplicates</span>
              </div>
              <p className="text-2xl font-sans font-bold text-amber-600">{duplicateCount}</p>
              <p className="text-[10px] text-[#5A5A40]/50">{duplicateAction === 'skip' ? 'will skip' : 'will overwrite'}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500/60" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40">Status</span>
              </div>
              <p className="text-lg font-sans font-bold text-green-600">Ready</p>
              <p className="text-[10px] text-[#5A5A40]/50">Review & import</p>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 text-red-600 px-6 py-4 rounded-2xl text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {/* Voter List Preview */}
          <div className="bg-white rounded-[24px] border border-black/5 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
              <h3 className="font-sans font-semibold text-[#1a1a1a]">
                Extracted Voters <span className="text-[#5A5A40]/40">({extractedVoters.length})</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { setExtractedVoters([]); setFiles([]); setProgress(null); setError(null); }}
                  className="text-xs text-[#5A5A40]/50 hover:text-red-500 font-bold px-4 py-2 rounded-full hover:bg-red-50 transition-all"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f5f5f0] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/50">SNo</th>
                    <th className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/50">Voter ID</th>
                    <th className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/50">Name (EN)</th>
                    <th className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/50">Name (ML)</th>
                    <th className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/50">Guardian</th>
                    <th className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/50">House</th>
                    <th className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/50">Age</th>
                    <th className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/50">Sex</th>
                    <th className="px-4 py-3 text-left text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedVoters.map((ev, idx) => {
                    const isDuplicate = voters.find(v => v.voterId === ev.voterId);
                    const isEditing = editingIndex === idx;
                    
                    return (
                      <tr 
                        key={idx} 
                        className={`border-t border-black/5 transition-colors ${
                          isDuplicate ? 'bg-amber-50/50' : 'hover:bg-[#f5f5f0]/50'
                        } ${isEditing ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              value={ev.serialNumber}
                              onChange={(e) => handleEditVoter(idx, 'serialNumber', parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 bg-[#f5f5f0] rounded-lg text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/20"
                            />
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#f5f5f0] text-xs font-bold text-[#5A5A40]">
                              {ev.serialNumber || '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={ev.voterId}
                              onChange={(e) => handleEditVoter(idx, 'voterId', e.target.value)}
                              className="w-28 px-2 py-1 bg-[#f5f5f0] rounded-lg text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/20"
                            />
                          ) : (
                            <span className={`text-xs font-mono font-bold ${isDuplicate ? 'text-amber-600' : 'text-[#5A5A40]'}`}>
                              {ev.voterId || '—'}
                              {isDuplicate && <span className="ml-1 text-[8px]">⚠</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={ev.nameEn}
                              onChange={(e) => handleEditVoter(idx, 'nameEn', e.target.value)}
                              className="w-36 px-2 py-1 bg-[#f5f5f0] rounded-lg text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/20"
                            />
                          ) : (
                            <span className="font-medium text-[#1a1a1a]">{ev.nameEn || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={ev.nameMl}
                              onChange={(e) => handleEditVoter(idx, 'nameMl', e.target.value)}
                              className="w-36 px-2 py-1 bg-[#f5f5f0] rounded-lg text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/20"
                            />
                          ) : (
                            <span className="text-[#5A5A40]/60 text-xs">{ev.nameMl || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={ev.guardianNameEn}
                                onChange={(e) => handleEditVoter(idx, 'guardianNameEn', e.target.value)}
                                className="w-32 px-2 py-1 bg-[#f5f5f0] rounded-lg text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/20"
                                placeholder="Guardian name"
                              />
                              <select
                                value={ev.guardianRelation}
                                onChange={(e) => handleEditVoter(idx, 'guardianRelation', e.target.value)}
                                className="w-32 px-2 py-1 bg-[#f5f5f0] rounded-lg text-xs border-0 focus:outline-none"
                              >
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Husband">Husband</option>
                                <option value="Wife">Wife</option>
                                <option value="Guardian">Guardian</option>
                              </select>
                            </div>
                          ) : (
                            <div>
                              <span className="text-xs text-[#1a1a1a]">{ev.guardianNameEn || ev.guardianNameMl || '—'}</span>
                              {ev.guardianRelation && (
                                <span className="block text-[9px] text-[#5A5A40]/40 uppercase">{ev.guardianRelation}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={ev.houseNumber}
                                onChange={(e) => handleEditVoter(idx, 'houseNumber', e.target.value)}
                                className="w-16 px-2 py-1 bg-[#f5f5f0] rounded-lg text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/20"
                                placeholder="No."
                              />
                              <input
                                type="text"
                                value={ev.houseNameEn}
                                onChange={(e) => handleEditVoter(idx, 'houseNameEn', e.target.value)}
                                className="w-28 px-2 py-1 bg-[#f5f5f0] rounded-lg text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/20"
                                placeholder="House name"
                              />
                            </div>
                          ) : (
                            <div>
                              {ev.houseNumber && (
                                <span className="inline-block px-2 py-0.5 bg-[#f5f5f0] rounded-lg text-xs font-bold text-[#5A5A40] mr-1">
                                  {ev.houseNumber}
                                </span>
                              )}
                              <span className="text-xs text-[#5A5A40]/50">{ev.houseNameEn || ev.houseNameMl || ''}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              value={ev.age}
                              onChange={(e) => handleEditVoter(idx, 'age', parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 bg-[#f5f5f0] rounded-lg text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#5A5A40]/20"
                            />
                          ) : (
                            <span className="text-xs text-[#5A5A40]/60">{ev.age || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              value={ev.gender}
                              onChange={(e) => handleEditVoter(idx, 'gender', e.target.value)}
                              className="w-20 px-2 py-1 bg-[#f5f5f0] rounded-lg text-xs border-0 focus:outline-none"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          ) : (
                            <span className={`text-[10px] font-bold uppercase ${ev.gender === 'Male' ? 'text-blue-600' : ev.gender === 'Female' ? 'text-pink-600' : 'text-[#5A5A40]/40'}`}>
                              {ev.gender === 'Male' ? 'M' : ev.gender === 'Female' ? 'F' : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingIndex(isEditing ? null : idx)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isEditing 
                                  ? 'bg-[#5A5A40] text-white' 
                                  : 'hover:bg-[#f5f5f0] text-[#5A5A40]/40 hover:text-[#5A5A40]'
                              }`}
                            >
                              {isEditing ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteVoter(idx)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-[#5A5A40]/20 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Progress */}
          {saving && (
            <div className="bg-white rounded-[24px] border border-black/5 p-8 space-y-4">
              <div className="flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-[#5A5A40] animate-spin" />
                <div>
                  <p className="font-sans font-semibold text-[#1a1a1a]">
                    Saving to database...
                  </p>
                  <p className="text-xs text-[#5A5A40]/50">
                    {saveProgress.saved} of {saveProgress.total} voters saved
                  </p>
                </div>
              </div>
              <div className="w-full bg-[#f5f5f0] rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#5A5A40] to-[#8E8E6E] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${saveProgress.total > 0 ? (saveProgress.saved / saveProgress.total) * 100 : 0}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!saving && (
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => { setExtractedVoters([]); setFiles([]); setProgress(null); setError(null); }}
                className="px-8 py-4 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans font-medium hover:bg-[#f5f5f0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToFirestore}
                disabled={saving}
                className="bg-[#5A5A40] hover:bg-[#4a4a30] text-white font-sans font-bold py-4 px-12 rounded-full transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5" />
                Import {extractedVoters.length} Voters & {newHouseCount} Houses
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
