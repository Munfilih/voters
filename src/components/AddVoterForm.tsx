import { useState, useEffect, useRef } from 'react';
import { auth, db, collection, doc, setDoc, onSnapshot, query, where } from '../firebase';
import { CheckCircle2, Star, Search, Plus } from 'lucide-react';
import { House } from '../types';
import AddHouseModal from './AddHouseModal';

interface AddVoterFormProps {
  boothId: string;
  onSuccess: () => void;
  compact?: boolean;
  preselectedHouse?: { id: string; houseNumber: string; name: string };
}

const inputClasses = 'w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl border border-transparent focus:border-[#5A5A40]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/5 transition-all font-sans';
const labelClasses = 'block text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40]/50 mb-3 ml-2';

export default function AddVoterForm({ boothId, onSuccess, compact, preselectedHouse }: AddVoterFormProps) {
  const [loading, setLoading] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [houseSearch, setHouseSearch] = useState(preselectedHouse ? `${preselectedHouse.houseNumber} · ${preselectedHouse.name}` : '');
  const [selectedHouse, setSelectedHouse] = useState<House | null>(preselectedHouse ? { id: preselectedHouse.id, boothId, ownerId: '', name: preselectedHouse.name, houseNumber: preselectedHouse.houseNumber } : null);
  const [showHouseDropdown, setShowHouseDropdown] = useState(false);
  const [showAddHouseModal, setShowAddHouseModal] = useState(false);
  const houseInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    serialNumber: '',
    voterId: '',
    name: '',
    houseNumber: '',
    houseName: '',
    guardianRelation: 'Father',
    guardianName: '',
    age: '',
    gender: 'Male',
    supportRating: 0,
    address: '',
    phone: '',
    isVerified: false,
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const houseNumber = selectedHouse?.houseNumber || formData.houseNumber;
      const houseName = selectedHouse?.name || formData.houseName;
      const houseId = selectedHouse?.id;

      const voterRef = doc(collection(db, 'voters'));
      const birthYear = formData.age ? new Date().getFullYear() - parseInt(formData.age) : undefined;
      const voterData: any = {
        id: voterRef.id,
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        voterId: formData.voterId,
        houseNumber,
        address: formData.address || houseName,
        guardianRelation: formData.guardianRelation,
        supportRating: formData.supportRating,
        isVerified: formData.isVerified,
        boothId,
        ownerId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
      };
      if (birthYear) voterData.birthYear = birthYear;
      if (formData.serialNumber) voterData.serialNumber = parseInt(formData.serialNumber);
      if (formData.guardianName) voterData.guardianName = formData.guardianName;
      if (formData.phone) voterData.phone = formData.phone;
      await setDoc(voterRef, voterData);

      if (houseId) {
        const house = houses.find(h => h.id === houseId);
        if (house && !house.mainVoterId) {
          await setDoc(doc(db, 'houses', houseId), { ...house, mainVoterId: voterRef.id });
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error adding voter:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHouses = houses.filter(h =>
    h.houseNumber.toLowerCase().includes(houseSearch.toLowerCase()) ||
    h.name.toLowerCase().includes(houseSearch.toLowerCase())
  );

  const handleSelectHouse = (house: House) => {
    setSelectedHouse(house);
    setHouseSearch(`${house.houseNumber} · ${house.name}`);
    setShowHouseDropdown(false);
    setFormData(prev => ({ ...prev, houseNumber: house.houseNumber, houseName: house.name }));
  };

  const handleVoterIdChange = (value: string) => {
    const letters = value.slice(0, 3).replace(/[^a-zA-Z]/g, '').toUpperCase();
    const numbers = value.slice(3).replace(/[^0-9]/g, '');
    return letters + numbers;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (!form) return;
      const focusable = Array.from(form.elements).filter(
        el => !((el as HTMLInputElement).readOnly) && !(el as HTMLInputElement).disabled &&
        (el.tagName === 'INPUT' || el.tagName === 'SELECT')
      ) as HTMLElement[];
      const idx = focusable.indexOf(e.currentTarget as HTMLElement);
      focusable[idx + 1]?.focus();
    }
  };

  const houseField = (
    <div>
      <label className={labelClasses}>House</label>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/30" />
          <input
            ref={houseInputRef}
            type="text"
            placeholder="Click to select house..."
            value={houseSearch}
            onChange={e => { setHouseSearch(e.target.value); setShowHouseDropdown(true); setSelectedHouse(null); }}
            onFocus={() => setShowHouseDropdown(true)}
            onKeyDown={handleKeyDown}
            className={`${inputClasses} pl-14`}
          />
          {showHouseDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-black/5 rounded-2xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {filteredHouses.length === 0 ? (
                <p className="px-6 py-3 text-xs text-[#5A5A40]/40">No houses found</p>
              ) : (
                filteredHouses.map(h => (
                  <button key={h.id} type="button" onClick={() => handleSelectHouse(h)}
                    className="w-full text-left px-6 py-3 hover:bg-[#f5f5f0] text-sm font-sans border-t border-black/5 first:border-0">
                    <span className="font-semibold">{h.houseNumber}</span> · {h.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button type="button" onClick={() => setShowAddHouseModal(true)}
          className="shrink-0 px-4 py-3 rounded-2xl bg-[#5A5A40] text-white text-xs font-bold hover:bg-[#4a4a30] transition-colors flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>
      {selectedHouse && (
        <div className="mt-2 px-4 py-3 bg-green-50 rounded-2xl border border-green-200">
          <p className="text-sm font-bold text-green-700">✓ {selectedHouse.name} (No. {selectedHouse.houseNumber})</p>
        </div>
      )}
    </div>
  );

  const formFields = (
    <>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={labelClasses}>Serial Number</label>
          <input type="number" min="1" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} onKeyDown={handleKeyDown} className={inputClasses} placeholder="e.g. 1" />
        </div>
        <div>
          <label className={labelClasses}>Voter ID</label>
          <input
            type="text"
            value={formData.voterId}
            onChange={e => setFormData({...formData, voterId: handleVoterIdChange(e.target.value)})}
            onKeyDown={handleKeyDown}
            inputMode={formData.voterId.length >= 3 ? 'numeric' : 'text'}
            className={inputClasses}
            placeholder="ABC1234567"
            maxLength={10}
          />
        </div>
      </div>
      <div>
        <label className={labelClasses}>Full Name</label>
        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Enter full name" />
      </div>
      {houseField}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className={labelClasses}>Relation</label>
          <select value={formData.guardianRelation} onChange={e => setFormData({...formData, guardianRelation: e.target.value})} onKeyDown={handleKeyDown} className={inputClasses}>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Husband">Husband</option>
            <option value="Wife">Wife</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelClasses}>Guardian Name</label>
          <input type="text" value={formData.guardianName} onChange={e => setFormData({...formData, guardianName: e.target.value})} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Name" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className={labelClasses}>Age</label>
          <input required type="number" min="18" max="120" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} onKeyDown={handleKeyDown} className={inputClasses} placeholder="25" />
        </div>
        <div>
          <label className={labelClasses}>Birth Year</label>
          <input type="number" value={formData.age ? new Date().getFullYear() - parseInt(formData.age) : ''} readOnly className={`${inputClasses} bg-[#e8e8e0] cursor-not-allowed`} placeholder="Auto" />
        </div>
        <div>
          <label className={labelClasses}>Gender</label>
          <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} onKeyDown={handleKeyDown} className={inputClasses}>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={labelClasses}>Phone (Optional)</label>
          <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} onKeyDown={handleKeyDown} className={inputClasses} placeholder="9876543210" />
        </div>
        <div>
          <label className={labelClasses}>Address (Optional)</label>
          <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Optional" />
        </div>
      </div>
      <div>
        <label className={labelClasses}>Support Rating</label>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(r => (
            <button key={r} type="button" onClick={() => setFormData({...formData, supportRating: r})} className="p-2 rounded-full hover:bg-[#f5f5f0] transition-colors">
              <Star className={`w-7 h-7 ${r <= formData.supportRating ? 'fill-amber-400 text-amber-400' : 'text-[#5A5A40]/20'}`} />
            </button>
          ))}
          {formData.supportRating > 0 && (
            <button type="button" onClick={() => setFormData({...formData, supportRating: 0})} className="ml-1 text-sm text-[#5A5A40]/40 hover:text-[#5A5A40]">Clear</button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setFormData({...formData, isVerified: !formData.isVerified})}
          className={`w-14 h-8 rounded-full transition-all relative ${formData.isVerified ? 'bg-[#5A5A40]' : 'bg-[#f5f5f0]'}`}>
          <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${formData.isVerified ? 'left-7' : 'left-1'}`} />
        </button>
        <div>
          <p className="text-sm font-medium text-[#1a1a1a]">Identity Verified</p>
          <p className="text-[10px] text-[#5A5A40]/50 uppercase tracking-widest font-bold">Physical verification completed</p>
        </div>
      </div>
    </>
  );

  const addHouseModal = showAddHouseModal && (
    <AddHouseModal
      boothId={boothId}
      onClose={() => setShowAddHouseModal(false)}
      onCreated={(houseNumber, houseName) => {
        setSelectedHouse({ id: '', boothId, ownerId: '', name: houseName, houseNumber });
        setHouseSearch(`${houseNumber} · ${houseName}`);
        setFormData(prev => ({ ...prev, houseNumber, houseName }));
        setShowAddHouseModal(false);
      }}
    />
  );

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="space-y-6 overflow-y-auto flex-1 pr-1">
          <section className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm space-y-6">
            <h3 className="text-xl font-sans font-semibold text-[#1a1a1a]">Voter Details</h3>
            {formFields}
          </section>
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t border-black/5">
          <button type="button" onClick={onSuccess} className="flex-1 py-3 px-4 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans text-sm hover:bg-[#f5f5f0] transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-3 px-4 rounded-full bg-[#5A5A40] text-white font-sans text-sm hover:bg-[#4a4a30] transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Voter'}
          </button>
        </div>
        {addHouseModal}
      </form>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-sans font-semibold text-[#1a1a1a]">Add Voter</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white p-8 md:p-12 rounded-[32px] border border-black/5 shadow-sm space-y-6">
          <h3 className="text-xl font-sans font-semibold text-[#1a1a1a]">Voter Details</h3>
          {formFields}
        </section>
        <div className="flex items-center justify-end gap-6 pt-4">
          <button type="button" onClick={onSuccess} className="text-[#5A5A40]/60 hover:text-[#5A5A40] font-sans font-medium transition-colors">Cancel</button>
          <button type="submit" disabled={loading}
            className="bg-[#5A5A40] hover:bg-[#4a4a30] text-white font-sans py-5 px-12 rounded-full transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-3">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Save Voter
          </button>
        </div>
      </form>
      {addHouseModal}
    </div>
  );
}
