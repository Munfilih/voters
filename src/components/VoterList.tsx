import React, { useState } from 'react';
import { Voter, House } from '../types';
import { Search, ChevronRight, CheckCircle2, Users, Plus, X, User, Star } from 'lucide-react';
import { auth, db, collection, doc, setDoc } from '../firebase';
import { motion } from 'motion/react';
import VoterDetail from './VoterDetail';

interface VoterListProps {
  voters: Voter[];
  houses: House[];
  boothId: string;
}

const inputClasses = 'w-full px-3 py-2 bg-[#f5f5f0] rounded-xl border border-transparent focus:border-[#5A5A40]/30 focus:outline-none focus:ring-0 font-sans text-sm transition-colors';
const labelClasses = 'block text-[10px] uppercase tracking-wider font-bold text-[#5A5A40]/60 mb-1.5';

export default function VoterList({ voters, houses, boothId }: VoterListProps) {
  const [search, setSearch] = useState('');
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [houseMode, setHouseMode] = useState<'existing' | 'new'>('existing');
  const [houseSearch, setHouseSearch] = useState('');
  const [form, setForm] = useState({
    name: '', age: '', gender: 'Male', voterId: '', address: '',
    isVerified: false,
    houseId: '', newHouseName: '', newHouseNumber: '', supportRating: 0,
  });

  const calculateBirthYear = (age: string) => {
    if (!age) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - parseInt(age);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        const elements = Array.from(form.elements) as HTMLElement[];
        const currentIndex = elements.indexOf(e.currentTarget as HTMLElement);
        const nextElement = elements[currentIndex + 1] as HTMLElement;
        if (nextElement && (nextElement.tagName === 'INPUT' || nextElement.tagName === 'SELECT' || nextElement.tagName === 'TEXTAREA')) {
          nextElement.focus();
        }
      }
    }
  };

  const filtered = voters.filter(v => {
    const q = search.toLowerCase();
    if (!q) return true;
    const houseName = houses.find(h => h.houseNumber === v.houseNumber)?.name || '';
    return (
      v.name.toLowerCase().includes(q) ||
      v.voterId.toLowerCase().includes(q) ||
      (v.address && v.address.toLowerCase().includes(q)) ||
      (v.houseNumber && v.houseNumber.toLowerCase().includes(q)) ||
      houseName.toLowerCase().includes(q) ||
      v.gender.toLowerCase().includes(q) ||
      String(v.age).includes(q) ||
      (v.category && v.category.toLowerCase().includes(q)) ||
      (v.incomeLevel && v.incomeLevel.toLowerCase().includes(q))
    );
  });

  const selectedHouse = houses.find(h => h.id === form.houseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      let houseNumber = '';

      if (houseMode === 'new' && form.newHouseNumber) {
        const houseRef = doc(collection(db, 'houses'));
        await setDoc(houseRef, {
          id: houseRef.id,
          boothId,
          ownerId: auth.currentUser.uid,
          name: form.newHouseName || form.newHouseNumber,
          houseNumber: form.newHouseNumber,
          createdAt: new Date().toISOString(),
        });
        houseNumber = form.newHouseNumber;
      } else if (houseMode === 'existing' && selectedHouse) {
        houseNumber = selectedHouse.houseNumber;
      }

      const voterRef = doc(collection(db, 'voters'));
      const birthYear = calculateBirthYear(form.age);
      await setDoc(voterRef, {
        id: voterRef.id,
        boothId,
        ownerId: auth.currentUser.uid,
        name: form.name,
        age: parseInt(form.age),
        birthYear: birthYear,
        gender: form.gender,
        voterId: form.voterId,
        address: form.address || selectedHouse?.name || form.newHouseName || '',
        houseNumber,
        isVerified: form.isVerified,
        supportRating: form.supportRating,
        createdAt: new Date().toISOString(),
      });

      // If this is the only voter in the house, set as main voter
      if (houseNumber) {
        const existingVoters = voters.filter(v => v.houseNumber === houseNumber);
        if (existingVoters.length === 0) {
          const houseToUpdate = houses.find(h => h.houseNumber === houseNumber);
          if (houseToUpdate) {
            await setDoc(doc(db, 'houses', houseToUpdate.id), {
              ...houseToUpdate,
              mainVoterId: voterRef.id
            });
          }
        }
      }

      setIsAdding(false);
      setForm({ name: '', age: '', gender: 'Male', voterId: '', address: '', isVerified: false, houseId: '', newHouseName: '', newHouseNumber: '', supportRating: 0 });
    } catch (err) {
      console.error('Error adding voter:', err);
    } finally {
      setSaving(false);
    }
  };

  if (selectedVoter) {
    return (
      <VoterDetail
        voter={selectedVoter}
        voters={voters}
        houses={houses}
        onBack={() => setSelectedVoter(null)}
        onUpdated={(updated) => setSelectedVoter(updated)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
          <input
            type="text"
            placeholder="Search voters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-full border border-black/5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-sans text-sm"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="w-11 h-11 flex items-center justify-center bg-[#5A5A40] text-white rounded-full hover:bg-[#4a4a30] transition-colors shadow-lg shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-black/5">
          <Users className="w-12 h-12 text-[#5A5A40]/20 mx-auto mb-4" />
          <p className="text-[#5A5A40]/40 font-sans">No voters found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          {filtered.map((v, i) => {
            const houseName = houses.find(h => h.houseNumber === v.houseNumber)?.name;
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVoter(v)}
                className={`flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-[#f5f5f0] transition-all ${i > 0 ? 'border-t border-black/5' : ''}`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#f5f5f0] flex items-center justify-center shrink-0">
                  {v.photoURL ? (
                    <img src={v.photoURL} alt={v.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-[#5A5A40]/30" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-sans font-semibold text-[#1a1a1a]">{v.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">{v.voterId} · {v.gender} · {v.age}</p>
                    {v.supportRating !== undefined && v.supportRating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= v.supportRating! ? 'fill-amber-400 text-amber-400' : 'text-[#5A5A40]/10'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(houseName || v.houseNumber) && (
                    <span className="text-xs text-[#5A5A40]/40">{houseName || v.houseNumber}</span>
                  )}
                  {v.isVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  <ChevronRight className="w-4 h-4 text-[#5A5A40]/30" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-sans font-semibold">Add Voter</h3>
              <button onClick={() => setIsAdding(false)} className="p-1.5 rounded-full hover:bg-[#f5f5f0]">
                <X className="w-5 h-5 text-[#5A5A40]/40" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto flex-1 pr-2">
              {/* House Selection */}
              <div>
                <label className={labelClasses}>House</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setHouseMode('existing')}
                    className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${houseMode === 'existing' ? 'bg-[#5A5A40] text-white' : 'bg-[#f5f5f0] text-[#5A5A40]/50'}`}>
                    Existing
                  </button>
                  <button type="button" onClick={() => setHouseMode('new')}
                    className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${houseMode === 'new' ? 'bg-[#5A5A40] text-white' : 'bg-[#f5f5f0] text-[#5A5A40]/50'}`}>
                    New
                  </button>
                </div>
                {houseMode === 'existing' ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
                    <input
                      type="text"
                      placeholder="Search house..."
                      value={houseSearch}
                      onChange={e => { setHouseSearch(e.target.value); setForm({ ...form, houseId: '' }); }}
                      onKeyDown={handleKeyDown}
                      className={`${inputClasses} pl-10`}
                    />
                    {houseSearch && !form.houseId && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-black/5 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                        {houses.filter(h =>
                          h.houseNumber.toLowerCase().includes(houseSearch.toLowerCase()) ||
                          h.name.toLowerCase().includes(houseSearch.toLowerCase())
                        ).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-[#5A5A40]/40">No houses found</p>
                        ) : (
                          houses.filter(h =>
                            h.houseNumber.toLowerCase().includes(houseSearch.toLowerCase()) ||
                            h.name.toLowerCase().includes(houseSearch.toLowerCase())
                          ).map(h => (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => { setForm({ ...form, houseId: h.id }); setHouseSearch(`${h.houseNumber} · ${h.name}`); }}
                              className="w-full text-left px-3 py-2 hover:bg-[#f5f5f0] text-sm font-sans border-t border-black/5 first:border-0"
                            >
                              <span className="font-semibold">{h.houseNumber}</span> · {h.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" required value={form.newHouseNumber} onChange={e => setForm({ ...form, newHouseNumber: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="House No." />
                    <input type="text" value={form.newHouseName} onChange={e => setForm({ ...form, newHouseName: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="House Name" />
                  </div>
                )}
              </div>

              <div>
                <label className={labelClasses}>Full Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Full name" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClasses}>Age</label>
                  <input required type="number" min="18" max="120" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="25" />
                </div>
                <div>
                  <label className={labelClasses}>Birth Year</label>
                  <input type="number" value={calculateBirthYear(form.age) || ''} readOnly className={`${inputClasses} bg-[#e8e8e0] cursor-not-allowed`} placeholder="Auto" />
                </div>
                <div>
                  <label className={labelClasses}>Gender</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClasses}>Voter ID</label>
                <input type="text" value={form.voterId} onChange={e => setForm({ ...form, voterId: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="ABC1234567" />
              </div>
              <div>
                <label className={labelClasses}>Address</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Optional" />
              </div>
              <div>
                <label className={labelClasses}>Support Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setForm({ ...form, supportRating: rating })}
                      className="p-1.5 rounded-lg hover:bg-[#f5f5f0] transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${rating <= form.supportRating ? 'fill-amber-400 text-amber-400' : 'text-[#5A5A40]/20'}`}
                      />
                    </button>
                  ))}
                  {form.supportRating > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, supportRating: 0 })}
                      className="ml-1 text-xs text-[#5A5A40]/40 hover:text-[#5A5A40] transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-[#5A5A40]/40 mt-1">
                  {form.supportRating === 0 && 'No rating'}
                  {form.supportRating === 1 && 'Strong Opposition'}
                  {form.supportRating === 2 && 'Likely Opposition'}
                  {form.supportRating === 3 && 'Neutral/Undecided'}
                  {form.supportRating === 4 && 'Likely Support'}
                  {form.supportRating === 5 && 'Strong Support'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm({ ...form, isVerified: !form.isVerified })}
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${form.isVerified ? 'bg-[#5A5A40]' : 'bg-[#f5f5f0]'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${form.isVerified ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-medium text-[#1a1a1a]">Verified</span>
              </div>

              <div className="flex gap-3 pt-4 mt-4 border-t border-black/5 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2.5 px-4 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans text-sm hover:bg-[#f5f5f0] transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 px-4 rounded-full bg-[#5A5A40] text-white font-sans text-sm hover:bg-[#4a4a30] transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Voter'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
