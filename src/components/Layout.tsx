import React from 'react';
import { User } from 'firebase/auth';
import { Booth, View } from '../types';
import { LayoutDashboard, Users, Building2, LogOut, Home, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  user?: User | null;
  currentBooth?: Booth | null;
  currentView?: View;
  onViewChange?: (view: View) => void;
  onLogout?: () => void;
  onChangeBooth?: () => void;
  onEditBooth?: () => void;
  children: React.ReactNode;
}

export default function Layout({ 
  user, 
  currentBooth, 
  currentView, 
  onViewChange, 
  onLogout, 
  onChangeBooth,
  onEditBooth,
  children 
}: LayoutProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'houses', label: 'Houses', icon: Building2 },
    { id: 'voter-list', label: 'Voters List', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-black/5 px-4 md:px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Booth Info */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => onViewChange?.('dashboard')}
              className="flex items-center gap-3 text-[#5A5A40] hover:opacity-80 transition-opacity"
            >
              <div className="hidden sm:block text-left">
                <h1 className="font-sans font-bold text-lg text-[#1a1a1a] leading-tight">Voters List</h1>
              </div>
            </button>

            {currentBooth && (
              <>
                <div className="h-8 w-px bg-black/5 hidden md:block" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={onChangeBooth}
                    className="p-2 rounded-full hover:bg-[#5A5A40]/10 transition-all"
                    title="Change Booth"
                  >
                    <Home className="w-4 h-4 text-[#5A5A40]/60" />
                  </button>
                  <div className="text-left">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40 leading-none mb-0.5">Booth</p>
                    <p className="text-sm font-sans font-semibold text-[#1a1a1a] leading-none">{currentBooth.name}</p>
                  </div>
                  {onEditBooth && (
                    <button
                      onClick={onEditBooth}
                      className="p-2 rounded-full hover:bg-[#5A5A40]/10 transition-all"
                      title="Edit Booth Info"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#5A5A40]/40 hover:text-[#5A5A40]" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Navigation Items */}
          {currentBooth && onViewChange && (
            <nav className="hidden md:flex items-center bg-[#f5f5f0] p-1 rounded-full border border-black/5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id as View)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-full transition-all font-sans text-xs font-bold uppercase tracking-widest",
                    currentView === item.id 
                      ? "bg-[#5A5A40] text-white shadow-md" 
                      : "text-[#5A5A40]/50 hover:text-[#5A5A40]"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {/* User & Sign Out */}
          <div className="flex items-center gap-4">
            {user && (
              <button 
                onClick={() => onViewChange?.('profile')}
                className={cn(
                  "flex items-center gap-3 sm:pr-4 sm:border-r border-black/5 hover:bg-[#5A5A40]/5 p-2 rounded-2xl transition-all group",
                  currentView === 'profile' && "bg-[#5A5A40]/5 sm:border-r-transparent"
                )}
              >
                <div className="block text-right">
                  <p className="text-xs font-bold text-[#1a1a1a] group-hover:text-[#5A5A40] transition-colors">{user.displayName || 'User'}</p>
                  <p className="text-[10px] text-[#5A5A40]/50 uppercase tracking-tighter">Admin</p>
                </div>
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=5A5A40&color=fff`} 
                  alt={user.displayName || 'User'} 
                  className="w-9 h-9 rounded-full border-2 border-[#f5f5f0] shadow-sm group-hover:border-[#5A5A40]/20 transition-all"
                  referrerPolicy="no-referrer"
                />
              </button>
            )}
            
            {onLogout && (
              <button 
                onClick={onLogout}
                className="p-2.5 text-[#5A5A40]/40 hover:text-red-500 hover:bg-red-50 rounded-full transition-all group"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation (Bottom of header) */}
        {currentBooth && onViewChange && (
          <nav className="md:hidden flex items-center justify-center gap-2 mt-4 pt-4 border-t border-black/5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id as View)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-sans text-[10px] font-bold uppercase tracking-widest",
                  currentView === item.id 
                    ? "bg-[#5A5A40] text-white shadow-md" 
                    : "bg-[#f5f5f0] text-[#5A5A40]/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden xs:block">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

