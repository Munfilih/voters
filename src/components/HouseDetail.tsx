import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Building2, Phone, Star, Pencil, Plus, X, Users, CheckCircle2, ChevronRight, Trash2, ListTodo, Check } from 'lucide-react';
import { auth, db, doc, setDoc, collection, deleteDoc, onSnapshot, query, where } from '../firebase';
import { House, Voter, Task } from '../types';
import VoterDetail from './VoterDetail';
import PhotoModal from './PhotoModal';

interface HouseDetailProps {
  house: House;
  allHouses: House[];
  voters: Voter[];
  boothId: string;
  onBack: () => void;
  onHouseUpdated: (updated: House) => void;
}

const inputClasses = 'w-full px-3 py-2 bg-[#f5f5f0] rounded-xl border border-transparent focus:border-[#5A5A40]/30 focus:outline-none focus:ring-0 font-sans text-sm transition-colors';
const labelClasses = 'block text-[10px] uppercase tracking-wider font-bold text-[#5A5A40]/60 mb-1.5';

export default function HouseDetail({ house, allHouses, voters, boothId, onBack, onHouseUpdated }: HouseDetailProps) {
  const members = voters.filter(v => v.houseNumber === house.houseNumber);
  const mainVoter = voters.find(v => v.id === house.mainVoterId);

  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '' });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.currentTarget.tagName !== 'TEXTAREA') {
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
      collection(db, 'tasks'),
      where('houseId', '==', house.id),
      where('ownerId', '==', auth.currentUser.uid)
    );
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
  }, [house.id]);

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const updated = { ...house, photoURL: base64 };
      await setDoc(doc(db, 'houses', house.id), updated);
      onHouseUpdated(updated);
    } catch (err) {
      console.error('Error uploading photo:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: house.name,
    houseNumber: house.houseNumber,
    road: house.road || '',
    phone: house.phone || '',
    secondaryPhone: house.secondaryPhone || '',
    mainVoterId: house.mainVoterId || '',
  });

  const [isAddingVoter, setIsAddingVoter] = useState(false);
  const [voterSaving, setVoterSaving] = useState(false);
  const [voterForm, setVoterForm] = useState({
    name: '', age: '', gender: 'Male', voterId: '', address: '',
    isVerified: false,
  });

  const calculateBirthYear = (age: string) => {
    if (!age) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - parseInt(age);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setEditSaving(true);
    try {
      const updated: House = {
        id: house.id,
        boothId: house.boothId,
        ownerId: house.ownerId,
        name: editForm.name,
        houseNumber: editForm.houseNumber,
        createdAt: house.createdAt,
        ...(editForm.road && { road: editForm.road }),
        ...(editForm.phone && { phone: editForm.phone }),
        ...(editForm.secondaryPhone && { secondaryPhone: editForm.secondaryPhone }),
        ...(editForm.mainVoterId && { mainVoterId: editForm.mainVoterId }),
      };
      await setDoc(doc(db, 'houses', house.id), updated);
      onHouseUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating house:', err);
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setVoterSaving(true);
    try {
      const ref = doc(collection(db, 'voters'));
      const birthYear = calculateBirthYear(voterForm.age);
      await setDoc(ref, {
        id: ref.id,
        boothId,
        ownerId: auth.currentUser.uid,
        name: voterForm.name,
        age: parseInt(voterForm.age),
        birthYear: birthYear,
        gender: voterForm.gender,
        voterId: voterForm.voterId,
        address: voterForm.address || house.name,
        houseNumber: house.houseNumber,
        isVerified: voterForm.isVerified,
        createdAt: new Date().toISOString(),
      });

      // If this is the only voter in the house, set as main voter
      if (members.length === 0) {
        await setDoc(doc(db, 'houses', house.id), {
          ...house,
          mainVoterId: ref.id
        });
      }

      setVoterForm({ name: '', age: '', gender: 'Male', voterId: '', address: '', isVerified: false });
      setIsAddingVoter(false);
    } catch (err) {
      console.error('Error adding voter:', err);
    } finally {
      setVoterSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!auth.currentUser) return;
    setDeleting(true);
    try {
      await Promise.all(members.map(v => deleteDoc(doc(db, 'voters', v.id))));
      await Promise.all(tasks.map(t => deleteDoc(doc(db, 'tasks', t.id))));
      await deleteDoc(doc(db, 'houses', house.id));
      onBack();
    } catch (err) {
      console.error('Error deleting house:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setTaskSaving(true);
    try {
      const ref = doc(collection(db, 'tasks'));
      await setDoc(ref, {
        id: ref.id,
        houseId: house.id,
        boothId,
        ownerId: auth.currentUser.uid,
        title: taskForm.title,
        description: taskForm.description,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setTaskForm({ title: '', description: '' });
      setIsAddingTask(false);
    } catch (err) {
      console.error('Error adding task:', err);
    } finally {
      setTaskSaving(false);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    try {
      const newStatus = task.status === 'pending' ? 'resolved' : 'pending';
      await setDoc(doc(db, 'tasks', task.id), {
        ...task,
        status: newStatus,
        ...(newStatus === 'resolved' ? { resolvedAt: new Date().toISOString() } : { resolvedAt: null }),
      });
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  if (selectedVoter) {
    return (
      <VoterDetail
        voter={selectedVoter}
        voters={voters}
        houses={allHouses}
        onBack={() => setSelectedVoter(null)}
        onUpdated={(updated) => setSelectedVoter(updated)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2.5 rounded-full hover:bg-[#5A5A40]/10 transition-all">
          <ArrowLeft className="w-5 h-5 text-[#5A5A40]" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-sans font-semibold text-[#1a1a1a]">{house.name}</h2>
          <p className="text-[#5A5A40]/50 text-sm">House No. {house.houseNumber}</p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] text-xs font-bold hover:bg-[#5A5A40]/5 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div onClick={() => setShowPhoto(true)} className="cursor-pointer">
              {house.photoURL ? (
                <img src={house.photoURL} alt={house.name} className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#5A5A40]/5 flex items-center justify-center hover:bg-[#5A5A40]/10 transition-colors">
                  <Building2 className="w-7 h-7 text-[#5A5A40]" />
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="font-sans font-semibold text-[#1a1a1a] text-lg">{house.name}</p>
            <p className="text-xs text-[#5A5A40]/40 uppercase tracking-widest">No. {house.houseNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {house.phone && (
            <a href={`tel:${house.phone}`} className="flex items-center gap-3 px-4 py-3 bg-[#f5f5f0] rounded-2xl hover:bg-[#5A5A40]/10 transition-colors cursor-pointer">
              <Phone className="w-4 h-4 text-[#5A5A40]/50" />
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40">Phone</p>
                <p className="text-sm font-sans text-[#1a1a1a]">{house.phone}</p>
              </div>
            </a>
          )}
          {house.secondaryPhone && (
            <a href={`tel:${house.secondaryPhone}`} className="flex items-center gap-3 px-4 py-3 bg-[#f5f5f0] rounded-2xl hover:bg-[#5A5A40]/10 transition-colors cursor-pointer">
              <Phone className="w-4 h-4 text-[#5A5A40]/30" />
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40">Secondary</p>
                <p className="text-sm font-sans text-[#1a1a1a]">{house.secondaryPhone}</p>
              </div>
            </a>
          )}
          {mainVoter && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#5A5A40]/5 rounded-2xl sm:col-span-2">
              <Star className="w-4 h-4 text-[#5A5A40]" />
              <div>
                <p className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40">Main Voter</p>
                <p className="text-sm font-sans font-semibold text-[#5A5A40]">{mainVoter.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voters Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5A5A40]/50" />
            <h3 className="font-sans font-semibold text-[#1a1a1a]">Voters <span className="text-[#5A5A40]/40 font-normal">({members.length})</span></h3>
          </div>
          <button
            onClick={() => setIsAddingVoter(true)}
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#4a4a30] transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Voter
          </button>
        </div>

        {members.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-black/5">
            <Users className="w-10 h-10 text-[#5A5A40]/20 mx-auto mb-3" />
            <p className="text-[#5A5A40]/40 font-sans text-sm">No Voters</p>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
            {members.map((v, i) => (
              <div key={v.id} onClick={() => setSelectedVoter(v)} className={`flex items-center justify-between px-8 py-5 cursor-pointer hover:bg-[#f5f5f0] transition-all ${i > 0 ? 'border-t border-black/5' : ''}`}>
                <div>
                  <p className="font-sans font-medium text-[#1a1a1a]">{v.name}</p>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">{v.voterId}</p>
                </div>
                <div className="flex items-center gap-3">
                  {v.isVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  <span className="text-xs font-bold text-[#5A5A40]/40">{v.gender} · {v.age}</span>
                  <ChevronRight className="w-4 h-4 text-[#5A5A40]/30" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[#5A5A40]/50" />
            <h3 className="font-sans font-semibold text-[#1a1a1a]">Tasks <span className="text-[#5A5A40]/40 font-normal">({tasks.filter(t => t.status === 'pending').length} pending)</span></h3>
          </div>
          <button
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#4a4a30] transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-black/5">
            <ListTodo className="w-10 h-10 text-[#5A5A40]/20 mx-auto mb-3" />
            <p className="text-[#5A5A40]/40 font-sans text-sm">No Tasks</p>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
            {tasks.map((task, i) => (
              <div key={task.id} className={`flex items-center justify-between px-8 py-5 ${i > 0 ? 'border-t border-black/5' : ''} ${task.status === 'resolved' ? 'opacity-60' : ''}`}>
                <div className="flex-1">
                  <p className={`font-sans font-medium text-[#1a1a1a] ${task.status === 'resolved' ? 'line-through' : ''}`}>{task.title}</p>
                  {task.description && <p className="text-xs text-[#5A5A40]/60 mt-1">{task.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={task.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'pending' | 'resolved';
                      setDoc(doc(db, 'tasks', task.id), {
                        ...task,
                        status: newStatus,
                        ...(newStatus === 'resolved' ? { resolvedAt: new Date().toISOString() } : { resolvedAt: null }),
                      });
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 cursor-pointer transition-colors"
                    style={{
                      backgroundColor: task.status === 'pending' ? '#FEF3C7' : '#D1FAE5',
                      color: task.status === 'pending' ? '#B45309' : '#065F46'
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPhoto && (
        <PhotoModal
          photoURL={house.photoURL}
          name={house.name}
          uploading={uploadingPhoto}
          onClose={() => setShowPhoto(false)}
          onPhoto={(file) => { handlePhotoUpload(file); setShowPhoto(false); }}
        />
      )}

      {/* Edit House Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-sans font-semibold">Edit House</h3>
              <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-full hover:bg-[#f5f5f0]"><X className="w-5 h-5 text-[#5A5A40]/40" /></button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-3.5 overflow-y-auto flex-1 pr-2">
              <div>
                <label className={labelClasses}>House Name</label>
                <input required type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>House Number</label>
                <input required type="text" value={editForm.houseNumber} onChange={e => setEditForm({ ...editForm, houseNumber: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Road / Street</label>
                <input type="text" value={editForm.road} onChange={e => setEditForm({ ...editForm, road: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>Phone</label>
                  <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Optional" />
                </div>
                <div>
                  <label className={labelClasses}>Secondary</label>
                  <input type="tel" value={editForm.secondaryPhone} onChange={e => setEditForm({ ...editForm, secondaryPhone: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Main Voter</label>
                <select value={editForm.mainVoterId} onChange={e => setEditForm({ ...editForm, mainVoterId: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses}>
                  <option value="">Select main voter</option>
                  {members.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </form>
            <div className="flex gap-3 pt-4 mt-4 border-t border-black/5">
              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-2.5 px-4 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans text-sm hover:bg-[#f5f5f0] transition-colors">Cancel</button>
              <button type="submit" onClick={handleEditSave} disabled={editSaving} className="flex-1 py-2.5 px-4 rounded-full bg-[#5A5A40] text-white font-sans text-sm hover:bg-[#4a4a30] transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                {editSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Voter Modal */}
      {isAddingVoter && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-sans font-semibold">Add Voter</h3>
              <button onClick={() => setIsAddingVoter(false)} className="p-1.5 rounded-full hover:bg-[#f5f5f0]"><X className="w-5 h-5 text-[#5A5A40]/40" /></button>
            </div>
            <form onSubmit={handleAddVoter} className="space-y-3.5 overflow-y-auto flex-1 pr-2">
              <div>
                <label className={labelClasses}>Full Name</label>
                <input required type="text" value={voterForm.name} onChange={e => setVoterForm({ ...voterForm, name: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="Full name" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClasses}>Age</label>
                  <input required type="number" min="18" max="120" value={voterForm.age} onChange={e => setVoterForm({ ...voterForm, age: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="25" />
                </div>
                <div>
                  <label className={labelClasses}>Birth Year</label>
                  <input type="number" value={calculateBirthYear(voterForm.age) || ''} readOnly className={`${inputClasses} bg-[#e8e8e0] cursor-not-allowed`} placeholder="Auto" />
                </div>
                <div>
                  <label className={labelClasses}>Gender</label>
                  <select value={voterForm.gender} onChange={e => setVoterForm({ ...voterForm, gender: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClasses}>Voter ID</label>
                <input type="text" value={voterForm.voterId} onChange={e => setVoterForm({ ...voterForm, voterId: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="ABC1234567" />
              </div>
              <div>
                <label className={labelClasses}>Address</label>
                <input type="text" value={voterForm.address} onChange={e => setVoterForm({ ...voterForm, address: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder={house.name} />
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setVoterForm({ ...voterForm, isVerified: !voterForm.isVerified })} className={`w-11 h-6 rounded-full transition-all relative ${voterForm.isVerified ? 'bg-[#5A5A40]' : 'bg-[#f5f5f0]'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${voterForm.isVerified ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-medium text-[#1a1a1a]">Verified</span>
              </div>

              <div className="flex gap-3 pt-4 mt-4 border-t border-black/5 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsAddingVoter(false)} className="flex-1 py-2.5 px-4 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans text-sm hover:bg-[#f5f5f0] transition-colors">Cancel</button>
                <button type="submit" disabled={voterSaving} className="flex-1 py-2.5 px-4 rounded-full bg-[#5A5A40] text-white font-sans text-sm hover:bg-[#4a4a30] transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                  {voterSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add Voter'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-sans font-semibold mb-4">Delete House?</h3>
            <p className="text-[#5A5A40]/60 mb-2">Are you sure you want to delete {house.name}?</p>
            {members.length > 0 && (
              <p className="text-red-500 text-sm mb-8">Warning: This will also delete {members.length} voter{members.length > 1 ? 's' : ''} in this house.</p>
            )}
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

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-sans font-semibold">Add Task</h3>
              <button onClick={() => setIsAddingTask(false)} className="p-1.5 rounded-full hover:bg-[#f5f5f0]"><X className="w-5 h-5 text-[#5A5A40]/40" /></button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-3.5">
              <div>
                <label className={labelClasses}>Task Title</label>
                <input required type="text" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} onKeyDown={handleKeyDown} className={inputClasses} placeholder="e.g. Follow up on voter registration" />
              </div>
              <div>
                <label className={labelClasses}>Description (Optional)</label>
                <textarea rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className={`${inputClasses} resize-none`} placeholder="Add details..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingTask(false)} className="flex-1 py-2.5 px-4 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans text-sm hover:bg-[#f5f5f0] transition-colors">Cancel</button>
                <button type="submit" disabled={taskSaving} className="flex-1 py-2.5 px-4 rounded-full bg-[#5A5A40] text-white font-sans text-sm hover:bg-[#4a4a30] transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                  {taskSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
