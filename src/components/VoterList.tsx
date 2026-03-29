import React, { useState } from 'react';
import { Voter, House } from '../types';
import { Search, ChevronRight, CheckCircle2, Users, Plus, User, Star } from 'lucide-react';
import VoterDetail from './VoterDetail';
import AddVoterForm from './AddVoterForm';

interface VoterListProps {
  voters: Voter[];
  houses: House[];
  boothId: string;
  onAddVoter?: () => void;
}

export default function VoterList({ voters, houses, boothId }: VoterListProps) {
  const [search, setSearch] = useState('');
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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
                    <p className="font-sans font-semibold text-[#1a1a1a] text-sm md:text-base truncate">{v.name}</p>
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
                    <span className="text-xs text-[#5A5A40]/40 hidden sm:inline">{houseName || v.houseNumber}</span>
                  )}
                  {v.isVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
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
