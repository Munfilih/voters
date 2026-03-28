import React, { useState } from 'react';
import { ArrowLeft, Pencil, CheckCircle2, User, Search, Star, Trash2 } from 'lucide-react';
import { auth, db, doc, setDoc, deleteDoc } from '../firebase';
import { Voter, House } from '../types';
import PhotoModal from './PhotoModal';
import { motion } from 'motion/react';

interface VoterDetailProps {
  voter: Voter;
  voters: Voter[];
  houses: House[];
  onBack: () => void;
  onUpdated: (updated: Voter) => void;
}

const inputClasses = 'w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl border border-transparent focus:border-[#5A5A40]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/5 transition-all font-sans';
const labelClasses = 'block text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40]/50 mb-3 ml-2';

export default function VoterDetail({ voter, voters, houses, onBack, onUpdated }: VoterDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [houseSearch, setHouseSearch] = useState(() => {
    const h = houses.find(h => h.houseNumber === voter.houseNumber);
    return h ? `${h.houseNumber} · ${h.name}` : voter.houseNumber || '';
  });
  const [selectedHouseNumber, setSelectedHouseNumber] = useState(voter.houseNumber || '');
  const [form, setForm] = useState({
    name: voter.name,
    age: String(voter.age),
    gender: voter.gender,
    voterId: voter.voterId,
    address: voter.address,
    houseNumber: voter.houseNumber || '',
    isVerified: voter.isVerified || false,
    supportRating: voter.supportRating || 0,
  });

  const calculateBirthYear = (age: string) => {
    if (!age) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - parseInt(age);
  };

  const calculateAge = (birthYear: number) => {
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
  };

  // Auto-update age based on birth year
  React.useEffect(() => {
    if (voter.birthYear) {
      const updatedAge = calculateAge(voter.birthYear);
      if (updatedAge !== voter.age) {
        setDoc(doc(db, 'voters', voter.id), { ...voter, age: updatedAge });
      }
    }
  }, []);

  const [showPhoto, setShowPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const updated = { ...voter, photoURL: base64 };
      await setDoc(doc(db, 'voters', voter.id), updated);
      onUpdated(updated);
    } catch (err) {
      console.error('Error uploading photo:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDelete = async () => {
    if (!auth.currentUser) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'voters', voter.id));
      onBack();
    } catch (err) {
      console.error('Error deleting voter:', err);
    } finally {
      setDeleting(false);
    }
  };

  const houseName = houses.find(h => h.houseNumber === voter.houseNumber)?.name;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const houseChanged = selectedHouseNumber !== voter.houseNumber;
      const birthYear = calculateBirthYear(form.age);
      const updated: Voter = {
        ...voter,
        name: form.name,
        age: parseInt(form.age),
        birthYear: birthYear || voter.birthYear,
        gender: form.gender as Voter['gender'],
        voterId: form.voterId,
        address: form.address,
        houseNumber: selectedHouseNumber,
        isVerified: form.isVerified,
        supportRating: form.supportRating,
      };
      await setDoc(doc(db, 'voters', voter.id), updated);

      if (houseChanged) {
        const oldHouse = houses.find(h => h.houseNumber === voter.houseNumber);
        if (oldHouse && oldHouse.mainVoterId === voter.id) {
          const remaining = voters.filter(v => v.houseNumber === voter.houseNumber && v.id !== voter.id);
          const nextMain = remaining.length > 0 ? remaining[0].id : null;
          const updatedHouse = { ...oldHouse };
          if (nextMain) updatedHouse.mainVoterId = nextMain;
          else delete updatedHouse.mainVoterId;
          await setDoc(doc(db, 'houses', oldHouse.id), updatedHouse);
        }
      }

      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating voter:', err);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: 'Voter ID', value: voter.voterId || '—' },
    { label: 'Age', value: String(voter.age) },
    { label: 'Birth Year', value: voter.birthYear ? String(voter.birthYear) : '—' },
    { label: 'Gender', value: voter.gender },
    { label: 'House', value: houseName ? `${voter.houseNumber} · ${houseName}` : voter.houseNumber || '—' },
    { label: 'Address', value: voter.address },
    { label: 'Support Rating', value: voter.supportRating && voter.supportRating > 0 ? '★'.repeat(voter.supportRating) + '☆'.repeat(5 - voter.supportRating) : 'Not rated' },
  ];

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsEditing(false)} className="p-2.5 rounded-full hover:bg-[#5A5A40]/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-[#5A5A40]" />
          </button>
          <h2 className="text-3xl font-sans font-semibold text-[#1a1a1a]">Edit Voter</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Personal Details */}
          <section className="bg-white p-8 md:p-12 rounded-[32px] border border-black/5 shadow-sm space-y-6">
            <h3 className="text-xl font-sans font-semibold text-[#1a1a1a]">Personal Details</h3>

            {/* House Search */}
            <div>
              <label className={labelClasses}>House</label>
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/30" />
                <input
                  type="text"
                  placeholder="Search house..."
                  value={houseSearch}
                  onChange={e => { setHouseSearch(e.target.value); setSelectedHouseNumber(''); }}
                  className={`${inputClasses} pl-14`}
                />
                {houseSearch && !selectedHouseNumber && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-black/5 rounded-2xl shadow-lg overflow-hidden">
                    {houses.filter(h =>
                      h.houseNumber.toLowerCase().includes(houseSearch.toLowerCase()) ||
                      h.name.toLowerCase().includes(houseSearch.toLowerCase())
                    ).map(h => (
                      <button key={h.id} type="button"
                        onClick={() => { setSelectedHouseNumber(h.houseNumber); setHouseSearch(`${h.houseNumber} · ${h.name}`); }}
                        className="w-full text-left px-6 py-3 hover:bg-[#f5f5f0] text-sm font-sans border-t border-black/5 first:border-0"
                      >
                        <span className="font-semibold">{h.houseNumber}</span> · {h.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelClasses}>Full Legal Name</label>
              <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClasses} placeholder="Full name as per ID" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClasses}>Age</label>
                <input required type="number" min="18" max="120" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className={inputClasses} placeholder="e.g. 25" />
              </div>
              <div>
                <label className={labelClasses}>Birth Year</label>
                <input type="number" value={calculateBirthYear(form.age) || ''} readOnly className={`${inputClasses} bg-[#e8e8e0] cursor-not-allowed`} placeholder="Auto" />
              </div>
              <div>
                <label className={labelClasses}>Gender</label>
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={inputClasses}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Voter ID Number</label>
              <input type="text" value={form.voterId} onChange={e => setForm({ ...form, voterId: e.target.value })} className={inputClasses} placeholder="e.g. ABC1234567" />
            </div>
          </section>

          {/* Household Info */}
          <section className="bg-white p-8 md:p-12 rounded-[32px] border border-black/5 shadow-sm space-y-6">
            <h3 className="text-xl font-sans font-semibold text-[#1a1a1a]">Household Information</h3>

            <div>
              <label className={labelClasses}>Residential Address</label>
              <textarea rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={`${inputClasses} resize-none`} placeholder="Enter full residential address" />
            </div>

            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setForm({ ...form, isVerified: !form.isVerified })}
                className={`w-14 h-8 rounded-full transition-all relative ${form.isVerified ? 'bg-[#5A5A40]' : 'bg-[#f5f5f0]'}`}>
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${form.isVerified ? 'left-7' : 'left-1'}`} />
              </button>
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">Identity Verified</p>
                <p className="text-[10px] text-[#5A5A40]/50 uppercase tracking-widest font-bold">Physical verification completed</p>
              </div>
            </div>
          </section>

          {/* Support Rating */}
          <section className="bg-white p-8 md:p-12 rounded-[32px] border border-black/5 shadow-sm space-y-6">
            <h3 className="text-xl font-sans font-semibold text-[#1a1a1a]">Support Rating</h3>
            <div>
              <label className={labelClasses}>Rate Voter Support</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setForm({ ...form, supportRating: rating })}
                    className="p-3 rounded-full hover:bg-[#f5f5f0] transition-colors"
                  >
                    <Star
                      className={`w-8 h-8 ${rating <= form.supportRating ? 'fill-amber-400 text-amber-400' : 'text-[#5A5A40]/20'}`}
                    />
                  </button>
                ))}
                {form.supportRating > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, supportRating: 0 })}
                    className="ml-2 text-sm text-[#5A5A40]/40 hover:text-[#5A5A40] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-[#5A5A40]/60 mt-3">
                {form.supportRating === 0 && 'No rating set'}
                {form.supportRating === 1 && '⭐ Strong Opposition'}
                {form.supportRating === 2 && '⭐⭐ Likely Opposition'}
                {form.supportRating === 3 && '⭐⭐⭐ Neutral/Undecided'}
                {form.supportRating === 4 && '⭐⭐⭐⭐ Likely Support'}
                {form.supportRating === 5 && '⭐⭐⭐⭐⭐ Strong Support'}
              </p>
            </div>
          </section>

          <div className="flex items-center justify-end gap-6 pt-4">
            <button type="button" onClick={() => setIsEditing(false)} className="text-[#5A5A40]/60 hover:text-[#5A5A40] font-sans font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="bg-[#5A5A40] hover:bg-[#4a4a30] text-white font-sans py-5 px-12 rounded-full transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-3">
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2.5 rounded-full hover:bg-[#5A5A40]/10 transition-all">
          <ArrowLeft className="w-5 h-5 text-[#5A5A40]" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-sans font-semibold text-[#1a1a1a]">{voter.name}</h2>
          <p className="text-[#5A5A40]/50 text-xs uppercase tracking-widest">{voter.voterId}</p>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/5 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] text-xs font-bold hover:bg-[#5A5A40]/5 transition-all">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-8 py-6 border-b border-black/5">
          <div onClick={() => setShowPhoto(true)} className="cursor-pointer">
            {voter.photoURL ? (
              <img src={voter.photoURL} alt={voter.name} className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#5A5A40]/5 flex items-center justify-center hover:bg-[#5A5A40]/10 transition-colors">
                <User className="w-7 h-7 text-[#5A5A40]" />
              </div>
            )}
          </div>
          <div>
            <p className="font-sans font-semibold text-xl text-[#1a1a1a]">{voter.name}</p>
            {voter.isVerified && (
              <div className="flex items-center gap-1.5 text-green-600 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-widest">Verified</span>
              </div>
            )}
          </div>
        </div>
        {fields.map((f, i) => (
          <div key={f.label} className={`flex items-center justify-between px-8 py-4 ${i > 0 ? 'border-t border-black/5' : ''}`}>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">{f.label}</span>
            <span className="text-sm font-sans text-[#1a1a1a]">{f.value}</span>
          </div>
        ))}
      </div>
      {showPhoto && (
        <PhotoModal
          photoURL={voter.photoURL}
          name={voter.name}
          uploading={uploadingPhoto}
          onClose={() => setShowPhoto(false)}
          onPhoto={(file) => { handlePhotoUpload(file); setShowPhoto(false); }}
        />
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-sans font-semibold mb-4">Delete Voter?</h3>
            <p className="text-[#5A5A40]/60 mb-8">Are you sure you want to delete {voter.name}? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3.5 px-6 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans text-sm hover:bg-[#f5f5f0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3.5 px-6 rounded-full bg-red-500 text-white font-sans text-sm hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
