import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, ChevronRight, Plus, Search } from 'lucide-react';
import { auth, db, collection, onSnapshot, doc, setDoc, query, where } from '../firebase';
import { Booth } from '../types';

interface BoothSelectionProps {
  onSelect: (booth: Booth) => void;
}

export default function BoothSelection({ onSelect }: BoothSelectionProps) {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newBoothName, setNewBoothName] = useState('');
  const [newWard, setNewWard] = useState('');
  const [newPanchayath, setNewPanchayath] = useState('');
  const [newNiyamasabha, setNewNiyamasabha] = useState('');
  const [newLokasabha, setNewLokasabha] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'booths'), where('ownerId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booth));
      setBooths(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddBooth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoothName || !auth.currentUser) return;
    
    try {
      const newRef = doc(collection(db, 'booths'));
      await setDoc(newRef, {
        id: newRef.id,
        name: newBoothName,
        ...(newWard && { ward: newWard }),
        ...(newPanchayath && { panchayath: newPanchayath }),
        ...(newNiyamasabha && { niyamasabha: newNiyamasabha }),
        ...(newLokasabha && { lokasabha: newLokasabha }),
        ownerId: auth.currentUser.uid
      });
      setNewBoothName('');
      setNewWard('');
      setNewPanchayath('');
      setNewNiyamasabha('');
      setNewLokasabha('');
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding booth:", error);
    }
  };

  const filteredBooths = booths.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    (b.panchayath?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
    (b.ward?.toLowerCase() ?? '').includes(search.toLowerCase())
  );

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-end">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
            <input 
              type="text"
              placeholder="Search booths..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-full border border-black/5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-sans text-sm"
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBooths.map((booth) => (
            <motion.button
              key={booth.id}
              whileHover={{ y: -4 }}
              onClick={() => onSelect(booth)}
              className="group bg-white p-8 rounded-[32px] border border-black/5 text-left transition-all hover:shadow-xl flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-[#5A5A40] mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-widest font-bold opacity-60">
                    {[booth.ward && `Ward ${booth.ward}`, booth.panchayath].filter(Boolean).join(' • ')}
                  </span>
                </div>
                <h3 className="text-2xl font-sans font-medium text-[#1a1a1a] group-hover:text-[#5A5A40] transition-colors">
                  {booth.name}
                </h3>
                <div className="mt-2 flex gap-4 text-[10px] uppercase tracking-wider font-bold text-[#5A5A40]/40">
                  {booth.niyamasabha && <span>{booth.niyamasabha}</span>}
                  {booth.lokasabha && <span>{booth.lokasabha}</span>}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#f5f5f0] flex items-center justify-center group-hover:bg-[#5A5A40] group-hover:text-white transition-all">
                <ChevronRight className="w-5 h-5" />
              </div>
            </motion.button>
          ))}

          <button 
            onClick={() => setIsAdding(true)}
            className="bg-transparent border-2 border-dashed border-[#5A5A40]/20 p-8 rounded-[32px] flex flex-col items-center justify-center gap-4 text-[#5A5A40]/40 hover:text-[#5A5A40] hover:border-[#5A5A40]/40 transition-all group"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-sans font-medium uppercase tracking-widest text-xs">Add New Booth</span>
          </button>
        </div>

        {isAdding && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[40px] p-12 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-3xl font-sans font-semibold mb-8">New Booth</h3>
              <form onSubmit={handleAddBooth} className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-[#5A5A40]/60 mb-2">Booth Name</label>
                  <input 
                    type="text"
                    required
                    value={newBoothName}
                    onChange={(e) => setNewBoothName(e.target.value)}
                    className="w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                    placeholder="e.g. Primary School Hall"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-bold text-[#5A5A40]/60 mb-2">Ward</label>
                    <input 
                      type="text"
                      value={newWard}
                      onChange={(e) => setNewWard(e.target.value)}
                      className="w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-bold text-[#5A5A40]/60 mb-2">Panchayath</label>
                    <input 
                      type="text"
                      value={newPanchayath}
                      onChange={(e) => setNewPanchayath(e.target.value)}
                      className="w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                      placeholder="e.g. City Council"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-[#5A5A40]/60 mb-2">Niyamasabha</label>
                  <input 
                    type="text"
                    value={newNiyamasabha}
                    onChange={(e) => setNewNiyamasabha(e.target.value)}
                    className="w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                    placeholder="Assembly Constituency"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest font-bold text-[#5A5A40]/60 mb-2">Loka Sabha</label>
                  <input 
                    type="text"
                    value={newLokasabha}
                    onChange={(e) => setNewLokasabha(e.target.value)}
                    className="w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                    placeholder="Parliamentary Constituency"
                  />
                </div>
                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 px-6 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans hover:bg-[#f5f5f0] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 px-6 rounded-full bg-[#5A5A40] text-white font-sans hover:bg-[#4a4a30] transition-colors shadow-lg"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
