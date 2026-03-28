import React, { useState } from 'react';
import { auth, db, collection, doc, setDoc } from '../firebase';
import { User, MapPin, Hash, Calendar, Info, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AddVoterFormProps {
  boothId: string;
  onSuccess: () => void;
}

export default function AddVoterForm({ boothId, onSuccess }: AddVoterFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    voterId: '',
    address: '',
    houseNumber: '',
    category: 'General',
    incomeLevel: 'Medium',
    isVerified: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    
    try {
      const newRef = doc(collection(db, 'voters'));
      await setDoc(newRef, {
        ...formData,
        id: newRef.id,
        age: parseInt(formData.age),
        boothId,
        ownerId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      onSuccess();
    } catch (error) {
      console.error("Error adding voter:", error);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl border border-transparent focus:border-[#5A5A40]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/5 transition-all font-sans";
  const labelClasses = "flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40]/50 mb-3 ml-2";

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header>
        <h2 className="text-4xl font-sans font-semibold text-[#1a1a1a] mb-2">
          New Registration
        </h2>
        <p className="text-[#5A5A40]/60 font-sans">
          Enter detailed household and voter information for administrative records.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Basic Information Section */}
        <section className="bg-white p-10 md:p-16 rounded-[48px] border border-black/5 shadow-sm space-y-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#5A5A40]/5 flex items-center justify-center text-[#5A5A40]">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-sans font-semibold text-[#1a1a1a]">Personal Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className={labelClasses}>Full Legal Name</label>
              <input 
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={inputClasses}
                placeholder="Enter full name as per ID"
              />
            </div>

            <div>
              <label className={labelClasses}>Age</label>
              <input 
                type="number"
                required
                min="18"
                max="120"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                className={inputClasses}
                placeholder="e.g. 25"
              />
            </div>

            <div>
              <label className={labelClasses}>Gender</label>
              <select 
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value as any})}
                className={inputClasses}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClasses}>Voter ID Number</label>
              <div className="relative">
                <Hash className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/30" />
                <input 
                  type="text"
                  required
                  value={formData.voterId}
                  onChange={(e) => setFormData({...formData, voterId: e.target.value})}
                  className={`${inputClasses} pl-14`}
                  placeholder="e.g. ABC1234567"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Household Section */}
        <section className="bg-white p-10 md:p-16 rounded-[48px] border border-black/5 shadow-sm space-y-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#5A5A40]/5 flex items-center justify-center text-[#5A5A40]">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-sans font-semibold text-[#1a1a1a]">Household Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className={labelClasses}>Residential Address</label>
              <textarea 
                required
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className={`${inputClasses} resize-none`}
                placeholder="Enter full residential address"
              />
            </div>

            <div>
              <label className={labelClasses}>House Number</label>
              <input 
                type="text"
                value={formData.houseNumber}
                onChange={(e) => setFormData({...formData, houseNumber: e.target.value})}
                className={inputClasses}
                placeholder="e.g. 42-B"
              />
            </div>

            <div>
              <label className={labelClasses}>Social Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                className={inputClasses}
              >
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
            </div>

            <div>
              <label className={labelClasses}>Income Level</label>
              <select 
                value={formData.incomeLevel}
                onChange={(e) => setFormData({...formData, incomeLevel: e.target.value as any})}
                className={inputClasses}
              >
                <option value="Low">Low (BPL)</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, isVerified: !formData.isVerified})}
                className={`w-14 h-8 rounded-full transition-all relative ${formData.isVerified ? 'bg-[#5A5A40]' : 'bg-[#f5f5f0]'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${formData.isVerified ? 'left-7' : 'left-1'}`} />
              </button>
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">Identity Verified</p>
                <p className="text-[10px] text-[#5A5A40]/50 uppercase tracking-widest font-bold">Physical verification completed</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-6 pt-8">
          <button 
            type="button"
            onClick={() => onSuccess()}
            className="text-[#5A5A40]/60 hover:text-[#5A5A40] font-sans font-medium transition-colors"
          >
            Discard Changes
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="bg-[#5A5A40] hover:bg-[#4a4a30] text-white font-sans py-5 px-12 rounded-full transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Register Voter
          </button>
        </div>
      </form>
    </div>
  );
}
