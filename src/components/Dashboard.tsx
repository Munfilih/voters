import React, { useMemo, useState } from 'react';
import { Voter, Task, View } from '../types';
import { cn } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { Users, UserCheck, UserX, TrendingUp, MapPin, Activity, ListTodo, Search, X, CheckCircle2, Star } from 'lucide-react';

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
      { name: 'Strong Opposition', value: voters.filter(v => v.supportRating === 1).length, fill: '#22C55E' },
      { name: 'Likely Opposition', value: voters.filter(v => v.supportRating === 2).length, fill: '#84CC16' },
      { name: 'Neutral/Undecided', value: voters.filter(v => v.supportRating === 3).length, fill: '#EAB308' },
      { name: 'Likely Support', value: voters.filter(v => v.supportRating === 4).length, fill: '#F97316' },
      { name: 'Strong Support', value: voters.filter(v => v.supportRating === 5).length, fill: '#EF4444' },
    ].filter(s => s.value > 0);

    const ratedVoters = voters.filter(v => v.supportRating && v.supportRating > 0);
    const avgSupport = ratedVoters.length > 0 
      ? ratedVoters.reduce((sum, v) => sum + (v.supportRating || 0), 0) / ratedVoters.length 
      : 0;

    // Predicted Votes Calculation
    // Logic: Calculate expected votes based on support ratings and verification status
    let predictedVotes = 0;
    
    voters.forEach(v => {
      if (!v.supportRating || v.supportRating === 0) {
        // No rating: assume 50% chance if verified, 30% if not
        predictedVotes += v.isVerified ? 0.5 : 0.3;
      } else {
        // Rating-based prediction:
        // 5 stars (Strong Support): 95% probability
        // 4 stars (Likely Support): 75% probability
        // 3 stars (Neutral): 50% probability
        // 2 stars (Likely Opposition): 25% probability
        // 1 star (Strong Opposition): 5% probability
        const probabilities = [0.05, 0.25, 0.5, 0.75, 0.95];
        const baseProbability = probabilities[v.supportRating - 1];
        
        // Boost probability by 10% if verified (more reliable data)
        const verificationBoost = v.isVerified ? 0.1 : 0;
        const finalProbability = Math.min(baseProbability + verificationBoost, 1);
        
        predictedVotes += finalProbability;
      }
    });

    // Calculate confidence level based on rated voters percentage
    const ratedPercentage = total > 0 ? (ratedVoters.length / total) * 100 : 0;
    const verifiedPercentage = total > 0 ? (verified / total) * 100 : 0;
    const confidenceLevel = ((ratedPercentage * 0.7) + (verifiedPercentage * 0.3));

    return { 
      total, 
      verified, 
      pending, 
      male, 
      female, 
      other, 
      ageGroups, 
      supportRatings, 
      avgSupport,
      predictedVotes: Math.round(predictedVotes),
      confidenceLevel: Math.round(confidenceLevel),
      ratedCount: ratedVoters.length
    };
  }, [voters]);

  const cards = [
    { label: 'Total Voters', value: stats.total, icon: Users, color: 'text-[#5A5A40]', onClick: () => onNavigate?.('voter-list') },
    { label: 'Predicted Votes', value: stats.predictedVotes, icon: TrendingUp, color: 'text-purple-600', subtext: `${stats.confidenceLevel}% confidence`, onClick: () => onNavigate?.('voter-list', 'support') },
    { label: 'Verified', value: stats.verified, icon: UserCheck, color: 'text-green-600', onClick: () => onNavigate?.('voter-list', 'verified') },
    { label: 'Avg Support', value: stats.avgSupport > 0 ? stats.avgSupport.toFixed(1) : '—', icon: Activity, color: 'text-blue-600', subtext: `${stats.ratedCount} rated`, onClick: () => onNavigate?.('voter-list', 'support') },
  ];

  const [serialInput, setSerialInput] = useState('');
  const [lookedUpVoter, setLookedUpVoter] = useState<Voter | null | undefined>(undefined);

  const handleSerialLookup = (val: string) => {
    setSerialInput(val);
    if (!val.trim()) { setLookedUpVoter(undefined); return; }
    const found = voters.find(v => String(v.serialNumber) === val.trim());
    setLookedUpVoter(found ?? null);
  };

  return (
    <div className="space-y-12" key={`dashboard-${voters.length}-${stats.predictedVotes}`}>
      <header>
        <h2 className="text-2xl md:text-4xl font-sans font-semibold text-[#1a1a1a] mb-2">
          Booth Analytics
        </h2>
        <p className="text-sm md:text-base text-[#5A5A40]/60 font-sans">
          Real-time insights and demographic distribution for the selected area.
        </p>
      </header>

      {/* Serial Number Lookup */}
      <div className="bg-white rounded-[32px] p-6 md:p-10 border border-black/5 shadow-sm">
        <h3 className="text-base md:text-xl font-sans font-semibold mb-5 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#5A5A40]"></span>
          Voter Lookup by Serial Number
        </h3>
        <div className="relative max-w-xs">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/30" />
          <input
            type="number"
            inputMode="numeric"
            placeholder="Enter serial number..."
            value={serialInput}
            onChange={e => handleSerialLookup(e.target.value)}
            className="w-full pl-12 pr-10 py-4 bg-[#f5f5f0] rounded-2xl border border-transparent focus:border-[#5A5A40]/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5A5A40]/5 transition-all font-sans"
          />
          {serialInput && (
            <button onClick={() => { setSerialInput(''); setLookedUpVoter(undefined); }} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-[#5A5A40]/30 hover:text-[#5A5A40]" />
            </button>
          )}
        </div>

        {lookedUpVoter === null && (
          <p className="mt-4 text-sm text-[#5A5A40]/50 font-sans">No voter found with serial number <span className="font-bold">{serialInput}</span>.</p>
        )}

        {lookedUpVoter && (
          <div className="mt-5 p-6 bg-[#f5f5f0] rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#5A5A40]/40 mb-1">Name</p>
                <p className="text-xl font-sans font-semibold text-[#1a1a1a] uppercase">{lookedUpVoter.name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {lookedUpVoter.isVerified && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {lookedUpVoter.supportRating && lookedUpVoter.supportRating > 0 && (
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= lookedUpVoter.supportRating! ? 'fill-amber-400 text-amber-400' : 'text-[#5A5A40]/15'}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Serial No.', value: lookedUpVoter.serialNumber },
                { label: 'Voter ID', value: lookedUpVoter.voterId },
                { label: 'Age', value: lookedUpVoter.age },
                { label: 'Gender', value: lookedUpVoter.gender },
                { label: 'House No.', value: lookedUpVoter.houseNumber },
                { label: 'Guardian', value: lookedUpVoter.guardianName ? `${lookedUpVoter.guardianRelation} · ${lookedUpVoter.guardianName}` : lookedUpVoter.guardianRelation },
                ...(lookedUpVoter.phone ? [{ label: 'Phone', value: lookedUpVoter.phone }] : []),
                ...(lookedUpVoter.address ? [{ label: 'Address', value: lookedUpVoter.address }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl px-4 py-3">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40 mb-1">{label}</p>
                  <p className="text-sm font-sans font-medium text-[#1a1a1a]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
            {card.subtext && (
              <p className="text-[9px] md:text-[10px] text-[#5A5A40]/60 mt-1 font-medium">{card.subtext}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* Prediction Breakdown */}
        <div className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-sm">
          <h3 className="text-base md:text-xl font-sans font-semibold mb-4 md:mb-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            Vote Prediction Analysis
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-transparent rounded-2xl">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-[#5A5A40]/40">Predicted Votes</p>
                <p className="text-3xl font-sans font-bold text-purple-600">{stats.predictedVotes}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest font-bold text-[#5A5A40]/40">Out of</p>
                <p className="text-2xl font-sans font-bold text-[#5A5A40]">{stats.total}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5A5A40]/60">Confidence Level</span>
                <span className="text-sm font-bold text-[#5A5A40]">{stats.confidenceLevel}%</span>
              </div>
              <div className="w-full bg-[#f5f5f0] rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${stats.confidenceLevel}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="p-3 bg-[#f5f5f0] rounded-xl">
                <p className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40 mb-1">Rated Voters</p>
                <p className="text-lg font-sans font-bold text-[#5A5A40]">{stats.ratedCount}</p>
                <p className="text-[9px] text-[#5A5A40]/60">{stats.total > 0 ? Math.round((stats.ratedCount / stats.total) * 100) : 0}% of total</p>
              </div>
              <div className="p-3 bg-[#f5f5f0] rounded-xl">
                <p className="text-[9px] uppercase tracking-widest font-bold text-[#5A5A40]/40 mb-1">Win Probability</p>
                <p className="text-lg font-sans font-bold text-[#5A5A40]">{stats.total > 0 ? Math.round((stats.predictedVotes / stats.total) * 100) : 0}%</p>
                <p className="text-[9px] text-[#5A5A40]/60">Expected turnout</p>
              </div>
            </div>


          </div>
        </div>

        {/* Age Distribution */}
        <div className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-sm">
          <h3 className="text-base md:text-xl font-sans font-semibold mb-4 md:mb-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#5A5A40]"></span>
            Age Distribution
          </h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ageGroups}>
                <defs>
                  <linearGradient id="ageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5A5A40" stopOpacity={1} />
                    <stop offset="100%" stopColor="#5A5A40" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5A5A40', opacity: 0.6 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#5A5A40', opacity: 0.6 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f5f5f0' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="url(#ageGradient)" 
                  radius={[12, 12, 0, 0]} 
                  barSize={40} 
                  label={{ position: 'top', fill: '#5A5A40', fontSize: 14, fontWeight: 'bold' }}
                  style={{
                    filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.15))'
                  }}
                />
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
          <div className="h-56 md:h-80">
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
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Support Rating Distribution */}
        {stats.supportRatings.length > 0 && (
          <div className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[40px] border border-black/5 shadow-sm lg:col-span-2">
            <h3 className="text-base md:text-xl font-sans font-semibold mb-4 md:mb-8 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#5A5A40]"></span>
              Voter Support Analysis
            </h3>
            <div className="space-y-4">
              {stats.supportRatings.map((rating, index) => {
                const percentage = stats.total > 0 ? (rating.value / stats.total) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rating.fill }}></div>
                        <span className="text-sm font-medium text-[#5A5A40]">{rating.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#5A5A40]/60">{percentage.toFixed(1)}%</span>
                        <span className="text-sm font-bold text-[#5A5A40] min-w-[2rem] text-right">{rating.value}</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#f5f5f0] rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          background: `linear-gradient(90deg, ${rating.fill} 0%, ${rating.fill}CC 100%)`,
                          boxShadow: `0 2px 8px ${rating.fill}40`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


