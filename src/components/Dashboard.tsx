import React, { useMemo } from 'react';
import { Voter, Task } from '../types';
import { cn } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { Users, UserCheck, UserX, TrendingUp, MapPin, Activity, ListTodo } from 'lucide-react';

interface DashboardProps {
  voters: Voter[];
  tasks?: Task[];
  onNavigate?: (view: View, filter?: string) => void;
}

const COLORS = ['#5A5A40', '#8E8E6E', '#C2C2A3', '#E6E6D1'];

export default function Dashboard({ voters, tasks = [], onNavigate }: DashboardProps) {
  const stats = useMemo(() => {
    const total = voters.length;
    const verified = voters.filter(v => v.isVerified).length;
    const pending = total - verified;
    const male = voters.filter(v => v.gender === 'Male').length;
    const female = voters.filter(v => v.gender === 'Female').length;
    const other = voters.filter(v => v.gender === 'Other').length;

    // Age distribution
    const ageGroups = [
      { name: '18-25', count: voters.filter(v => v.age >= 18 && v.age <= 25).length },
      { name: '26-40', count: voters.filter(v => v.age > 25 && v.age <= 40).length },
      { name: '41-60', count: voters.filter(v => v.age > 40 && v.age <= 60).length },
      { name: '60+', count: voters.filter(v => v.age > 60).length },
    ];

    // Support rating distribution
    const supportRatings = [
      { name: '1 Star', value: voters.filter(v => v.supportRating === 1).length },
      { name: '2 Stars', value: voters.filter(v => v.supportRating === 2).length },
      { name: '3 Stars', value: voters.filter(v => v.supportRating === 3).length },
      { name: '4 Stars', value: voters.filter(v => v.supportRating === 4).length },
      { name: '5 Stars', value: voters.filter(v => v.supportRating === 5).length },
    ].filter(s => s.value > 0);

    const ratedVoters = voters.filter(v => v.supportRating && v.supportRating > 0);
    const avgSupport = ratedVoters.length > 0 
      ? ratedVoters.reduce((sum, v) => sum + (v.supportRating || 0), 0) / ratedVoters.length 
      : 0;

    return { total, verified, pending, male, female, other, ageGroups, supportRatings, avgSupport };
  }, [voters]);

  const cards = [
    { label: 'Total Voters', value: stats.total, icon: Users, color: 'text-[#5A5A40]', onClick: () => onNavigate?.('voter-list') },
    { label: 'Verified', value: stats.verified, icon: UserCheck, color: 'text-green-600', onClick: () => onNavigate?.('voter-list', 'verified') },
    { label: 'Pending Tasks', value: tasks.filter(t => t.status === 'pending').length, icon: ListTodo, color: 'text-amber-600', onClick: () => onNavigate?.('tasks') },
    { label: 'Avg Support', value: stats.avgSupport > 0 ? stats.avgSupport.toFixed(1) : '—', icon: TrendingUp, color: 'text-blue-600', onClick: () => onNavigate?.('voter-list', 'support') },
  ];

  return (
    <div className="space-y-12">
      <header>
        <h2 className="text-2xl md:text-4xl font-sans font-semibold text-[#1a1a1a] mb-2">
          Booth Analytics
        </h2>
        <p className="text-sm md:text-base text-[#5A5A40]/60 font-sans">
          Real-time insights and demographic distribution for the selected area.
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {cards.map((card, i) => (
          <div 
            key={i} 
            onClick={card.onClick}
            className="bg-white p-4 md:p-8 rounded-[20px] md:rounded-[32px] border border-black/5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className={cn("p-2 md:p-3 rounded-xl md:rounded-2xl bg-[#f5f5f0]", card.color)}>
                <card.icon className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-500 opacity-40" />
            </div>
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40 mb-1">{card.label}</p>
            <h3 className="text-xl md:text-3xl font-sans font-bold text-[#1a1a1a]">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* Age Distribution */}
        <div className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-sm">
          <h3 className="text-base md:text-xl font-sans font-semibold mb-4 md:mb-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#5A5A40]"></span>
            Age Distribution
          </h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ageGroups}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5A5A40', opacity: 0.6 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5A5A40', opacity: 0.6 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f5f5f0' }}
                />
                <Bar dataKey="count" fill="#5A5A40" radius={[8, 8, 0, 0]} barSize={40} label={{ position: 'top', fill: '#5A5A40', fontSize: 14, fontWeight: 'bold' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-sm">
          <h3 className="text-base md:text-xl font-sans font-semibold mb-4 md:mb-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#5A5A40]"></span>
            Demographics
          </h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Male', value: stats.male },
                    { name: 'Female', value: stats.female },
                    { name: 'Other', value: stats.other },
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Support Rating Distribution */}
        {stats.supportRatings.length > 0 && (
          <div className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-sm lg:col-span-2">
            <h3 className="text-base md:text-xl font-sans font-semibold mb-4 md:mb-8 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#5A5A40]"></span>
              Support Rating Distribution
            </h3>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.supportRatings}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5A5A40', opacity: 0.6 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5A5A40', opacity: 0.6 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: '#f5f5f0' }}
                  />
                  <Bar dataKey="value" fill="#FFA500" radius={[8, 8, 0, 0]} barSize={60} label={{ position: 'top', fill: '#5A5A40', fontSize: 14, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


