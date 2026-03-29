import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { auth, db, collection, doc, setDoc } from '../firebase';

interface AddHouseModalProps {
  boothId: string;
  onClose: () => void;
  onCreated: (houseNumber: string, houseName: string) => void;
}

const inputClasses = 'w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl border border-transparent focus:border-[#5A5A40]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/5 transition-all font-sans';
const labelClasses = 'block text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40]/50 mb-3 ml-2';

export default function AddHouseModal({ boothId, onClose, onCreated }: AddHouseModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', houseNumber: '', phone: '', secondaryPhone: '', road: '' });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const f = e.currentTarget.form;
      if (!f) return;
      const els = Array.from(f.elements).filter(el => el.tagName === 'INPUT') as HTMLElement[];
      const idx = els.indexOf(e.currentTarget);
      els[idx + 1]?.focus();
    }
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
        createdAt: new Date().toISOString(),
      });
      onCreated(form.houseNumber, form.name);
    } catch (err) {
      console.error('Error adding house:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-sans font-semibold">New House</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f5f5f0] transition-colors">
            <X className="w-5 h-5 text-[#5A5A40]/40" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
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
          <div className="flex gap-3 pt-4 border-t border-black/5">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans text-sm hover:bg-[#f5f5f0] transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 px-4 rounded-full bg-[#5A5A40] text-white font-sans text-sm hover:bg-[#4a4a30] transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save House'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
