import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Database, UserPlus, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from '../firebase';

interface LoginProps {
  onLogin: () => void; // This is not strictly needed anymore since App.tsx listens to onAuthStateChanged
}

export default function Login({ onLogin }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use.");
      } else if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password sign-in is not enabled in the Firebase Console. Please enable it in the Authentication tab.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full pl-12 pr-6 py-4 bg-[#f5f5f0] rounded-2xl border border-transparent focus:border-[#5A5A40]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/5 transition-all font-sans";
  const iconClasses = "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5A5A40]/30";

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[32px] p-10 md:p-12 shadow-xl border border-black/5 text-center"
      >
        <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
          <Database className="text-white w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-sans font-bold text-[#1a1a1a] mb-2">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="text-[#5A5A40]/60 font-sans mb-10 text-sm">
          {isSignUp ? 'Register for administrative access.' : 'Sign in to your administrative portal.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <UserIcon className={iconClasses} />
                <input 
                  type="text"
                  required
                  placeholder="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClasses}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className={iconClasses} />
            <input 
              type="email"
              required
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div className="relative">
            <Lock className={iconClasses} />
            <input 
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5A5A40] hover:bg-[#4a4a30] text-white font-sans font-bold py-4 px-8 rounded-full transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-black/5 flex flex-col gap-4">
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-sm font-sans font-medium text-[#5A5A40] hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
          
          <p className="text-[10px] text-[#5A5A40]/40 uppercase tracking-widest font-bold">
            Administrative Access Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}
