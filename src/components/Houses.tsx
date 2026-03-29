import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building2, Users, Plus, X, ChevronRight, Search, Star } from 'lucide-react';
import { auth, db, collection, onSnapshot, doc, setDoc, query, where } from '../firebase';
import { House, Voter } from '../types';
import HouseDetail from './HouseDetail';

interface HousesProps {
  boothId: string;
  voters: Voter[];
}

const inputClasses = 'w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl border border-transparent focus:border-[#5A5A40]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/5 transition-all font-sans';
const labelClasses = 'block text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40]/50 mb-3 ml-2';

export default function Houses({ boothId, voters }: HousesProps) {
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', houseNumber: '', phone: '', secondaryPhone: '', mainVoterId: '', road: ''
  });

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

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'houses'),
      where('boothId', '==', boothId),
      where('ownerId', '==', auth.currentUser.uid)
    );
    return onSnapshot(q, (snap) => {
      setHouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as House)));
    });
  }, [boothId]);

  const openAdd = () => {
    setForm({ name: '', houseNumber: '', phone: '', secondaryPhone: '', mainVoterId: '', road: '' });
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const ref = doc(collection(db, 'houses'));
      await setDoc(ref, {
        id: ref.id,
        boothId,
        ownerId: auth.currentUser.uid,
        name: form.name,
        houseNumber: form.houseNumber,
        ...(form.road && { road: form.road }),
        ...(form.phone && { phone: form.phone }),
        ...(form.secondaryPhone && { secondaryPhone: form.secondaryPhone }),
        ...(form.mainVoterId && { mainVoterId: form.mainVoterId }),
        createdAt: new Date().toISOString(),
      });
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding house:', err);
    } finally {
      setSaving(false);
    }
  };

  const votersForHouse = voters.filter(v => v.houseNumber === form.houseNumber);

  const filteredHouses = houses.filter(h => {
    const q = search.toLowerCase();
    if (!q) return true;
    const members = voters.filter(v => v.houseNumber === h.houseNumber);
    return (
      h.houseNumber.toLowerCase().includes(q) ||
      h.name.toLowerCase().includes(q) ||
      (h.phone && h.phone.includes(q)) ||
      (h.secondaryPhone && h.secondaryPhone.includes(q)) ||
      members.some(v =>
        v.name.toLowerCase().includes(q) ||
        v.voterId.toLowerCase().includes(q) ||
        v.gender.toLowerCase().includes(q) ||
        String(v.age).includes(q) ||
        (v.address && v.address.toLowerCase().includes(q)) ||
        (v.category && v.category.toLowerCase().includes(q))
      )
    );
  }).sort((a, b) => a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true }));

  if (selectedHouse) {
    return (
      <HouseDetail
        house={selectedHouse}
        allHouses={houses}
        voters={voters}
        boothId={boothId}
        onBack={() => setSelectedHouse(null)}
        onHouseUpdated={(updated) => {
          setHouses(prev => prev.map(h => h.id === updated.id ? updated : h));
          setSelectedHouse(updated);
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
          <input
            type="text"
            placeholder="Search houses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-full border border-black/5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-sans text-sm"
          />
        </div>
        <button
          onClick={openAdd}
          className="w-11 h-11 flex items-center justify-center bg-[#5A5A40] text-white rounded-full hover:bg-[#4a4a30] transition-colors shadow-lg shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {houses.length === 0 ? (
        <div className="bg-white rounded-[40px] p-16 text-center border border-black/5">
          <Building2 className="w-12 h-12 text-[#5A5A40]/20 mx-auto mb-4" />
          <p className="text-[#5A5A40]/40 font-sans">No houses added yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          {filteredHouses.map((house, i) => {
            const members = voters.filter(v => v.houseNumber === house.houseNumber);
            const mainVoter = members.find(v => v.id === house.mainVoterId);
            const displayVoter = mainVoter || members[0]; // Show main voter or first available voter
            const ratings = members.filter(v => v.supportRating && v.supportRating > 0).map(v => v.supportRating!);
            const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
            return (
              <div
                key={house.id}
                onClick={() => setSelectedHouse(house)}
                className={`flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#f5f5f0] transition-all ${i > 0 ? 'border-t border-black/5' : ''}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-sans font-semibold text-[#1a1a1a] uppercase">{house.houseNumber.toUpperCase()}</p>
                    {displayVoter && <span className="text-[#5A5A40]/60">·</span>}
                    {displayVoter && <p className="font-sans font-medium text-[#5A5A40] uppercase">{displayVoter.name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">{house.name.toUpperCase()}</p>
                    {avgRating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-[#5A5A40]/10'}`}
                          />
                        ))}
                        <span className="text-[10px] text-[#5A5A40]/40 ml-1">({avgRating.toFixed(1)})</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(house.phone) && (
                    <a 
                      href={`tel:${house.phone}`} 
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-[#5A5A40]/50 hover:text-[#5A5A40] hover:underline transition-colors"
                    >
                      {house.phone}
                    </a>
                  )}
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-[#f5f5f0] rounded-full">
                    {members.length === 0
                      ? <span className="text-xs font-bold text-[#5A5A40]/40">No Voters</span>
                      : <><Users className="w-3 h-3 text-[#5A5A40]/40" /><span className="text-xs font-bold text-[#5A5A40]/50 ml-1">{members.length}</span></>
                    }
                  </div>
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
              <h3 className="text-xl font-sans font-semibold">New House</h3>
              <button onClick={() => setIsAdding(false)} className="p-1.5 rounded-full hover:bg-[#f5f5f0] transition-colors">
                <X className="w-5 h-5 text-[#5A5A40]/40" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto flex-1 pr-2">
              <div>
                <label className={labelClasses}>House Number</label>
                <input required type="text" value={form.houseNumber} onChange={e => setForm({ ...form, houseNumber: e.target.value.toUpperCase() })} onKeyDown={handleKeyDown} className={`${inputClasses} uppercase`} placeholder="e.g. H-123" />
              </div>
              <div>
                <label className={labelClasses}>House Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })} onKeyDown={handleKeyDown} className={`${inputClasses} uppercase`} placeholder="e.g. SMITH RESIDENCE" />
              </div>
              <div>
                <label className={labelClasses}>Road / Street</label>
                <input type="text" value={form.road} onChange={e => setForm({ ...form, road: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>Phone Number</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Optional" />
                </div>
                <div>
                  <label className={labelClasses}>Secondary Number</label>
                  <input type="tel" value={form.secondaryPhone} onChange={e => setForm({ ...form, secondaryPhone: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Main Voter</label>
                <select
                  value={form.mainVoterId}
                  onChange={e => setForm({ ...form, mainVoterId: e.target.value })}
                  onKeyDown={handleKeyDown}
                  className={inputClasses}
                  disabled={votersForHouse.length === 0}
                >
                  <option value="">Select main voter</option>
                  {votersForHouse.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </form>

            <div className="flex gap-3 pt-4 mt-4 border-t border-black/5">
              <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2.5 px-4 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans text-sm hover:bg-[#f5f5f0] transition-colors">Cancel</button>
              <button type="submit" onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 px-4 rounded-full bg-[#5A5A40] text-white font-sans text-sm hover:bg-[#4a4a30] transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save House'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
