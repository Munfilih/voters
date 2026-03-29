import React, { useState, useEffect } from 'react';
import { auth, db, onAuthStateChanged, signOut, signInWithPopup, googleProvider, collection, onSnapshot, query, where, getDocs, setDoc, doc, deleteDoc } from './firebase';
import { User } from 'firebase/auth';
import { Booth, Voter, View, Task } from './types';
import Login from './components/Login';
import BoothSelection from './components/BoothSelection';
import Dashboard from './components/Dashboard';
import VoterList from './components/VoterList';
import AddVoterForm from './components/AddVoterForm';
import Houses from './components/Houses';
import TasksList from './components/TasksList';
import Profile from './components/Profile';
import Layout from './components/Layout';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentBooth, setCurrentBooth] = useState<Booth | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [previousView, setPreviousView] = useState<View>('dashboard');
  const [voters, setVoters] = useState<Voter[]>([]);
  const [houses, setHouses] = useState<import('./types').House[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingBooth, setEditingBooth] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', ward: '', panchayath: '', niyamasabha: '', lokasabha: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [deletingBooth, setDeletingBooth] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        setCurrentBooth(null);
        setCurrentView('dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !currentBooth) {
      setVoters([]);
      return;
    }

    const q = query(
      collection(db, 'voters'), 
      where('boothId', '==', currentBooth.id),
      where('ownerId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Voter));
      setVoters(data);
    }, (error) => {
      console.error("Firestore Error: ", error);
    });

    return () => unsubscribe();
  }, [user, currentBooth]);

  useEffect(() => {
    if (!user || !currentBooth) { setHouses([]); return; }
    const q = query(collection(db, 'houses'), where('boothId', '==', currentBooth.id), where('ownerId', '==', user.uid));
    return onSnapshot(q, snap => setHouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as import('./types').House))));
  }, [user, currentBooth]);

  useEffect(() => {
    if (!user || !currentBooth) { setTasks([]); return; }
    const q = query(collection(db, 'tasks'), where('boothId', '==', currentBooth.id), where('ownerId', '==', user.uid));
    return onSnapshot(q, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))));
  }, [user, currentBooth]);

  const handleViewChange = (view: View) => {
    if (view !== 'profile') {
      setPreviousView(view);
    }
    setCurrentView(view);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleEditBooth = () => {
    if (!currentBooth) return;
    setEditForm({
      name: currentBooth.name || '',
      ward: currentBooth.ward || '',
      panchayath: currentBooth.panchayath || '',
      niyamasabha: currentBooth.niyamasabha || '',
      lokasabha: currentBooth.lokasabha || '',
    });
    setEditingBooth(true);
  };

  const handleSaveEditBooth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBooth || !editForm.name) return;
    setEditSaving(true);
    try {
      const updated: Booth = {
        ...currentBooth,
        name: editForm.name,
        ward: editForm.ward,
        panchayath: editForm.panchayath,
        niyamasabha: editForm.niyamasabha,
        lokasabha: editForm.lokasabha,
      };
      await setDoc(doc(db, 'booths', currentBooth.id), updated);
      setCurrentBooth(updated);
      setEditingBooth(false);
    } catch (error) {
      console.error('Error updating booth:', error);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteBooth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBooth || !user) return;
    
    // Password verification
    if (deletePassword !== 'DELETE') {
      setDeleteError('Incorrect password. Type DELETE to confirm.');
      return;
    }

    setEditSaving(true);
    try {
      // Delete all voters in this booth
      const votersQuery = query(
        collection(db, 'voters'),
        where('boothId', '==', currentBooth.id),
        where('ownerId', '==', user.uid)
      );
      const votersSnapshot = await getDocs(votersQuery);
      await Promise.all(votersSnapshot.docs.map(d => deleteDoc(doc(db, 'voters', d.id))));

      // Delete all houses in this booth
      const housesQuery = query(
        collection(db, 'houses'),
        where('boothId', '==', currentBooth.id),
        where('ownerId', '==', user.uid)
      );
      const housesSnapshot = await getDocs(housesQuery);
      await Promise.all(housesSnapshot.docs.map(d => deleteDoc(doc(db, 'houses', d.id))));

      // Delete all tasks in this booth
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('boothId', '==', currentBooth.id),
        where('ownerId', '==', user.uid)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      await Promise.all(tasksSnapshot.docs.map(d => deleteDoc(doc(db, 'tasks', d.id))));

      // Delete the booth itself
      await deleteDoc(doc(db, 'booths', currentBooth.id));

      // Reset state
      setCurrentBooth(null);
      setDeletingBooth(false);
      setDeletePassword('');
      setDeleteError('');
    } catch (error) {
      console.error('Error deleting booth:', error);
      setDeleteError('Failed to delete booth. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5A5A40]"></div>
      </div>
    );
  }

  return (
    <Layout 
      user={user} 
      currentBooth={currentBooth} 
      currentView={currentView} 
      onViewChange={handleViewChange}
      onLogout={user ? handleLogout : undefined}
      onChangeBooth={user && currentBooth ? () => setCurrentBooth(null) : undefined}
      onEditBooth={user && currentBooth ? handleEditBooth : undefined}
      onDeleteBooth={user && currentBooth ? () => setDeletingBooth(true) : undefined}
    >
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : currentView === 'profile' ? (
        <Profile user={user} onBack={() => setCurrentView(previousView)} />
      ) : !currentBooth ? (
        <BoothSelection onSelect={setCurrentBooth} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === 'dashboard' && <Dashboard voters={voters} tasks={tasks} onNavigate={(view) => setCurrentView(view)} />}
            {currentView === 'voter-list' && <VoterList voters={voters} houses={houses} boothId={currentBooth.id} onAddVoter={() => setCurrentView('add-voter')} />}
            {currentView === 'houses' && <Houses boothId={currentBooth.id} voters={voters} />}
            {currentView === 'tasks' && <TasksList boothId={currentBooth.id} onBack={() => setCurrentView('dashboard')} />}
            {currentView === 'add-voter' && (
              <AddVoterForm 
                boothId={currentBooth.id} 
                onSuccess={() => setCurrentView('voter-list')} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {deletingBooth && currentBooth && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-sans font-semibold mb-4 text-red-600">Delete Booth</h3>
            <p className="text-[#5A5A40]/60 mb-2">Are you sure you want to delete <strong>{currentBooth.name}</strong>?</p>
            <p className="text-red-500 text-sm mb-6">Warning: This will permanently delete all voters, houses, and tasks in this booth.</p>
            
            <form onSubmit={handleDeleteBooth} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-[#5A5A40]/60 mb-2">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError('');
                  }}
                  className="w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 font-sans"
                  placeholder="Type DELETE"
                  autoFocus
                />
                {deleteError && (
                  <p className="text-red-500 text-xs mt-2">{deleteError}</p>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingBooth(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="flex-1 py-4 px-6 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans hover:bg-[#f5f5f0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-4 px-6 rounded-full bg-red-500 text-white font-sans hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {editSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete Booth'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {editingBooth && currentBooth && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-sans font-semibold mb-6">Edit Booth</h3>
            <form onSubmit={handleSaveEditBooth} className="space-y-5">
              {(['name', 'ward', 'panchayath', 'niyamasabha', 'lokasabha'] as const).map((key) => (
                <div key={key}>
                  <label className="block text-xs uppercase tracking-widest font-bold text-[#5A5A40]/60 mb-2">{key}</label>
                  <input
                    type="text"
                    required={key === 'name'}
                    value={editForm[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    className="w-full px-6 py-4 bg-[#f5f5f0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                  />
                </div>
              ))}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingBooth(false)} className="flex-1 py-4 px-6 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans hover:bg-[#f5f5f0] transition-colors">Cancel</button>
                <button type="submit" disabled={editSaving} className="flex-1 py-4 px-6 rounded-full bg-[#5A5A40] text-white font-sans hover:bg-[#4a4a30] transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                  {editSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
