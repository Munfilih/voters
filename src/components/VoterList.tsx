import React, { useState } from 'react';
import { Voter, House } from '../types';
import { Search, ChevronRight, CheckCircle2, Users, Plus, User, Star, Filter } from 'lucide-react';
import VoterDetail from './VoterDetail';
import AddVoterForm from './AddVoterForm';

interface VoterListProps {
  voters: Voter[];
  houses: House[];
  boothId: string;
  onAddVoter?: () => void;
}

type FilterType = 'all' | 'male' | 'female' | 'removed' | 'unverified';

export default function VoterList({ voters, houses, boothId }: VoterListProps) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilter = activeFilter !== 'all' || !!ageMin || !!ageMax;

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'male', label: 'Male' },
    { key: 'female', label: 'Female' },
    { key: 'unverified', label: 'Unverified' },
    { key: 'removed', label: 'Removed' },
  ];

  const filtered = voters.filter(v => {
    if (activeFilter === 'male' && v.gender !== 'Male') return false;
    if (activeFilter === 'female' && v.gender !== 'Female') return false;
    if (activeFilter === 'removed' && !v.isRemoved) return false;
    if (activeFilter === 'unverified' && v.isVerified) return false;
    if (ageMin && v.age < parseInt(ageMin)) return false;
    if (ageMax && v.age > parseInt(ageMax)) return false;
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
  }).sort((a, b) => {
    if (a.serialNumber && b.serialNumber) return a.serialNumber - b.serialNumber;
    if (a.serialNumber) return -1;
    if (b.serialNumber) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

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

  if (isAdding) {
    return <AddVoterForm boothId={boothId} onSuccess={() => setIsAdding(false)} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
          <input
            type="text"
            placeholder="Search voters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white rounded-full border border-black/5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-sans text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors shadow-lg shrink-0 relative ${
            hasActiveFilter ? 'bg-[#5A5A40] text-white' : 'bg-white border border-black/10 text-[#5A5A40]/60 hover:border-[#5A5A40]/30'
          }`}
        >
          <Filter className="w-4 h-4" />
          {hasActiveFilter && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />}
        </button>
        <button
          onClick={() => setIsAdding(true)}
          className="w-11 h-11 flex items-center justify-center bg-[#5A5A40] text-white rounded-full hover:bg-[#4a4a30] transition-colors shadow-lg shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl p-4 border border-black/5 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  activeFilter === f.key
                    ? f.key === 'removed' ? 'bg-red-500 text-white' : 'bg-[#5A5A40] text-white'
                    : 'bg-[#f5f5f0] text-[#5A5A40]/60 hover:bg-[#5A5A40]/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40 shrink-0">Age</span>
            <input
              type="number"
              placeholder="Min"
              value={ageMin}
              onChange={e => setAgeMin(e.target.value)}
              className="w-20 px-3 py-1.5 bg-[#f5f5f0] rounded-full text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[#5A5A40]/30 text-sm">—</span>
            <input
              type="number"
              placeholder="Max"
              value={ageMax}
              onChange={e => setAgeMax(e.target.value)}
              className="w-20 px-3 py-1.5 bg-[#f5f5f0] rounded-full text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {(ageMin || ageMax) && (
              <button onClick={() => { setAgeMin(''); setAgeMax(''); }} className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 hover:text-[#5A5A40] transition-colors">Clear</button>
            )}
          </div>
        </div>
      )}

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
                className={`flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 cursor-pointer hover:bg-[#f5f5f0] transition-all ${i > 0 ? 'border-t border-black/5' : ''}`}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-[#f5f5f0] flex items-center justify-center shrink-0">
                  {v.photoURL ? (
                    <img src={v.photoURL} alt={v.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 md:w-6 md:h-6 text-[#5A5A40]/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {v.serialNumber && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#5A5A40]/10 text-[8px] font-bold text-[#5A5A40] shrink-0">{v.serialNumber}</span>
                    )}
                    <p className="font-sans font-semibold text-[#1a1a1a] text-sm md:text-base truncate uppercase">{v.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">{v.voterId} · {v.gender} · {v.age}</p>
                    {v.supportRating !== undefined && v.supportRating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={`w-3 h-3 ${star <= v.supportRating! ? 'fill-amber-400 text-amber-400' : 'text-[#5A5A40]/10'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                  {(houseName || v.houseNumber) && (
                    <span className="text-xs text-[#5A5A40]/40 hidden sm:inline uppercase">{houseName || v.houseNumber}</span>
                  )}
                  {v.isVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {v.isRemoved && <span className="text-[9px] font-bold uppercase tracking-widest text-red-400 bg-red-50 px-2 py-0.5 rounded-full">Removed</span>}
                  <ChevronRight className="w-4 h-4 text-[#5A5A40]/30" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
