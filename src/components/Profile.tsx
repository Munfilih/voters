import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { User as UserIcon, Mail, Camera, Save, CheckCircle2, AlertCircle, ArrowLeft, Phone, Building2, Briefcase, FileText, Download, Upload, Database } from 'lucide-react';
import { updateProfile, db, doc, getDoc, setDoc, collection, query, where, getDocs } from '../firebase';

interface ProfileProps {
  user: User;
  onBack: () => void;
}

export default function Profile({ user, onBack }: ProfileProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPhoneNumber(data.phoneNumber || '');
          setOrganization(data.organization || '');
          setRole(data.role || '');
          setBio(data.bio || '');
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchUserData();
  }, [user.uid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Update Auth Profile
      await updateProfile(user, {
        displayName,
        photoURL
      });

      // Update Firestore Profile
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        email: user.email,
        phoneNumber,
        organization,
        role,
        bio
      }, { merge: true });

      setSuccess(true);
    } catch (err: any) {
      console.error("Profile Update Error:", err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackupData = async () => {
    setBackingUp(true);
    setBackupSuccess(false);
    setError(null);

    try {
      // Fetch all user data
      const backupData: any = {
        exportDate: new Date().toISOString(),
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber,
          organization,
          role,
          bio
        },
        booths: [],
        voters: [],
        houses: [],
        tasks: []
      };

      // Fetch Booths
      const boothsQuery = query(collection(db, 'booths'), where('ownerId', '==', user.uid));
      const boothsSnapshot = await getDocs(boothsQuery);
      backupData.booths = boothsSnapshot.docs.map(d => d.data());

      // Fetch Voters
      const votersQuery = query(collection(db, 'voters'), where('ownerId', '==', user.uid));
      const votersSnapshot = await getDocs(votersQuery);
      backupData.voters = votersSnapshot.docs.map(d => d.data());

      // Fetch Houses
      const housesQuery = query(collection(db, 'houses'), where('ownerId', '==', user.uid));
      const housesSnapshot = await getDocs(housesQuery);
      backupData.houses = housesSnapshot.docs.map(d => d.data());

      // Fetch Tasks
      const tasksQuery = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
      const tasksSnapshot = await getDocs(tasksQuery);
      backupData.tasks = tasksSnapshot.docs.map(d => d.data());

      // Create JSON file
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Download file
      const link = document.createElement('a');
      link.href = url;
      link.download = `voters-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 5000);
    } catch (err: any) {
      console.error("Backup Error:", err);
      setError(err.message || "Failed to backup data.");
    } finally {
      setBackingUp(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/json') {
      setRestoreFile(file);
      setShowRestoreConfirm(true);
    } else {
      setError('Please select a valid JSON backup file.');
    }
  };

  const handleRestoreData = async () => {
    if (!restoreFile) return;
    
    setRestoring(true);
    setRestoreSuccess(false);
    setError(null);
    setShowRestoreConfirm(false);

    try {
      // Read file
      const fileText = await restoreFile.text();
      const backupData = JSON.parse(fileText);

      // Validate backup structure
      if (!backupData.booths || !backupData.voters || !backupData.houses || !backupData.tasks) {
        throw new Error('Invalid backup file format');
      }

      // Generate new IDs and map old IDs to new IDs
      const boothIdMap = new Map<string, string>();
      const houseIdMap = new Map<string, string>();
      const voterIdMap = new Map<string, string>();
      const taskIdMap = new Map<string, string>();

      // Restore Booths with new IDs
      for (const booth of backupData.booths) {
        const newBoothRef = doc(collection(db, 'booths'));
        const newBoothId = newBoothRef.id;
        boothIdMap.set(booth.id, newBoothId);
        
        await setDoc(newBoothRef, {
          ...booth,
          id: newBoothId,
          ownerId: user.uid // Assign to current user
        });
      }

      // Restore Houses with new IDs and updated boothId
      for (const house of backupData.houses) {
        const newHouseRef = doc(collection(db, 'houses'));
        const newHouseId = newHouseRef.id;
        houseIdMap.set(house.id, newHouseId);
        
        const newBoothId = boothIdMap.get(house.boothId) || house.boothId;
        const newMainVoterId = house.mainVoterId ? (voterIdMap.get(house.mainVoterId) || house.mainVoterId) : undefined;
        
        await setDoc(newHouseRef, {
          ...house,
          id: newHouseId,
          boothId: newBoothId,
          ownerId: user.uid,
          ...(newMainVoterId && { mainVoterId: newMainVoterId })
        });
      }

      // Restore Voters with new IDs and updated boothId
      for (const voter of backupData.voters) {
        const newVoterRef = doc(collection(db, 'voters'));
        const newVoterId = newVoterRef.id;
        voterIdMap.set(voter.id, newVoterId);
        
        const newBoothId = boothIdMap.get(voter.boothId) || voter.boothId;
        
        await setDoc(newVoterRef, {
          ...voter,
          id: newVoterId,
          boothId: newBoothId,
          ownerId: user.uid
        });
      }

      // Update houses with correct mainVoterId after all voters are created
      for (const house of backupData.houses) {
        if (house.mainVoterId) {
          const newHouseId = houseIdMap.get(house.id);
          const newMainVoterId = voterIdMap.get(house.mainVoterId);
          if (newHouseId && newMainVoterId) {
            await setDoc(doc(db, 'houses', newHouseId), {
              mainVoterId: newMainVoterId
            }, { merge: true });
          }
        }
      }

      // Restore Tasks with new IDs and updated references
      for (const task of backupData.tasks) {
        const newTaskRef = doc(collection(db, 'tasks'));
        const newTaskId = newTaskRef.id;
        taskIdMap.set(task.id, newTaskId);
        
        const newBoothId = boothIdMap.get(task.boothId) || task.boothId;
        const newHouseId = houseIdMap.get(task.houseId) || task.houseId;
        
        await setDoc(newTaskRef, {
          ...task,
          id: newTaskId,
          boothId: newBoothId,
          houseId: newHouseId,
          ownerId: user.uid
        });
      }

      setRestoreSuccess(true);
      setRestoreFile(null);
      setTimeout(() => setRestoreSuccess(false), 5000);
    } catch (err: any) {
      console.error("Restore Error:", err);
      setError(err.message || "Failed to restore data. Please check the backup file.");
    } finally {
      setRestoring(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5A5A40]"></div>
      </div>
    );
  }

  const inputClasses = "w-full pl-16 pr-8 py-5 bg-[#f5f5f0] rounded-3xl focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/5 focus:bg-white border border-transparent focus:border-[#5A5A40]/10 transition-all font-sans";
  const labelClasses = "block text-xs uppercase tracking-widest font-bold text-[#5A5A40]/60 ml-4 mb-2";
  const iconClasses = "absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5A5A40]/30";

  return (
    <div className="max-w-3xl mx-auto py-10">
      <header className="mb-12">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[#5A5A40]/60 hover:text-[#5A5A40] font-sans text-xs font-bold uppercase tracking-widest mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
        <h2 className="text-4xl font-sans font-semibold text-[#1a1a1a] mb-4">
          Admin Profile
        </h2>
        <p className="text-[#5A5A40]/70">
          Manage your administrative credentials and detailed profile information.
        </p>
      </header>

      <div className="bg-white rounded-[40px] p-10 md:p-12 shadow-xl border border-black/5">
        <div className="flex flex-col items-center mb-12">
          <div className="relative group">
            <img 
              src={photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=5A5A40&color=fff`} 
              alt={displayName || 'User'} 
              className="w-32 h-32 rounded-full border-4 border-[#f5f5f0] shadow-lg object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="text-white w-8 h-8" />
            </div>
          </div>
          <h3 className="mt-6 text-2xl font-sans font-bold text-[#1a1a1a]">{displayName || 'Administrator'}</h3>
          <p className="text-[#5A5A40]/50 uppercase tracking-widest text-[10px] font-bold mt-1">
            {role || 'System Administrator'}
          </p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-10">
          <section>
            <h4 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40] mb-6 pb-2 border-b border-black/5">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelClasses}>Full Name</label>
                <div className="relative">
                  <UserIcon className={iconClasses} />
                  <input 
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClasses}
                    placeholder="Your Full Name"
                  />
                </div>
              </div>

              <div className="space-y-2 opacity-60">
                <label className={labelClasses}>Email Address</label>
                <div className="relative">
                  <Mail className={iconClasses} />
                  <input 
                    type="email"
                    disabled
                    value={user.email || ''}
                    className={inputClasses.replace('bg-[#f5f5f0]', 'bg-[#f5f5f0] cursor-not-allowed')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClasses}>Phone Number</label>
                <div className="relative">
                  <Phone className={iconClasses} />
                  <input 
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={inputClasses}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClasses}>Profile Photo URL</label>
                <div className="relative">
                  <Camera className={iconClasses} />
                  <input 
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className={inputClasses}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40] mb-6 pb-2 border-b border-black/5">Administrative Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelClasses}>Organization</label>
                <div className="relative">
                  <Building2 className={iconClasses} />
                  <input 
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className={inputClasses}
                    placeholder="e.g. Election Commission"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClasses}>Designation / Role</label>
                <div className="relative">
                  <Briefcase className={iconClasses} />
                  <input 
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={inputClasses}
                    placeholder="e.g. Senior Supervisor"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={labelClasses}>Professional Bio</label>
                <div className="relative">
                  <FileText className="absolute left-6 top-6 w-5 h-5 text-[#5A5A40]/30" />
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={inputClasses.replace('py-5', 'py-6 min-h-[120px]')}
                    placeholder="Tell us about your administrative experience..."
                  />
                </div>
              </div>
            </div>
          </section>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-red-50 rounded-3xl flex items-center gap-4 text-red-600 text-sm border border-red-100"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-green-50 rounded-3xl flex items-center gap-4 text-green-600 text-sm border border-green-100"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p>Profile updated successfully!</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5A5A40] hover:bg-[#4a4a30] text-white font-sans font-bold py-5 px-10 rounded-full transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Profile Details
              </>
            )}
          </button>
        </form>

        {/* Backup Section */}
        <div className="mt-12 pt-10 border-t border-black/5">
          <h4 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40] mb-6">Data Management</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleBackupData}
              disabled={backingUp}
              className="flex items-center justify-center gap-3 p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-3xl border border-blue-200 transition-all group disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                {backingUp ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="text-left">
                <p className="font-sans font-bold text-blue-900">Export Backup</p>
                <p className="text-xs text-blue-600">Download all your data</p>
              </div>
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="restore-file-input"
              />
              <label
                htmlFor="restore-file-input"
                className="flex items-center justify-center gap-3 p-6 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-3xl border border-green-200 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-sans font-bold text-green-900">Import Backup</p>
                  <p className="text-xs text-green-600">Restore from backup file</p>
                </div>
              </label>
            </div>
          </div>

          {backupSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-green-50 rounded-2xl flex items-center gap-3 text-green-600 text-sm border border-green-100"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Backup completed successfully!</p>
                <p className="text-xs text-green-500 mt-1">Your data has been exported to a JSON file.</p>
              </div>
            </motion.div>
          )}

          {restoreSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-green-50 rounded-2xl flex items-center gap-3 text-green-600 text-sm border border-green-100"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Data restored successfully!</p>
                <p className="text-xs text-green-500 mt-1">All data has been imported from the backup file.</p>
              </div>
            </motion.div>
          )}

          <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <div className="flex gap-3">
              <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 leading-relaxed">
                <p className="font-bold mb-1">Backup Information:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-600">
                  <li>Exports all booths, voters, houses, and tasks</li>
                  <li>Data is saved as JSON format</li>
                  <li>Backups can be shared and imported by anyone</li>
                  <li>Import creates new copies with new IDs</li>
                  <li>Your existing data remains safe during import</li>
                  <li>Store backups securely offline</li>
                  <li>Regular backups recommended weekly</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Restore Confirmation Modal */}
        {showRestoreConfirm && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-sans font-semibold mb-4 text-amber-600">Confirm Restore</h3>
              <p className="text-[#5A5A40]/60 mb-2">Are you sure you want to restore data from this backup?</p>
              <p className="text-amber-600 text-sm mb-6">
                <strong>Note:</strong> This will create new copies of all data from the backup. Your existing data will remain unchanged. All imported data will be assigned to your account with new IDs.
              </p>
              
              <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
                <p className="text-xs text-blue-600">
                  <strong>File:</strong> {restoreFile?.name}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <strong>Size:</strong> {restoreFile ? (restoreFile.size / 1024).toFixed(2) : 0} KB
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRestoreConfirm(false);
                    setRestoreFile(null);
                  }}
                  className="flex-1 py-4 px-6 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] font-sans hover:bg-[#f5f5f0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreData}
                  disabled={restoring}
                  className="flex-1 py-4 px-6 rounded-full bg-amber-500 text-white font-sans hover:bg-amber-600 transition-colors shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {restoring ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    'Restore Data'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Full Screen Restoring Effect */}
        {restoring && (
          <div className="fixed inset-0 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center z-[60]">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full mx-auto mb-6"
              />
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl md:text-3xl font-sans font-semibold text-white mb-2"
              >
                Restoring Data
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/60 font-sans text-sm"
              >
                Importing your backup data...
              </motion.p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
