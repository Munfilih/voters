import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ListTodo, Check, Trash2, ArrowLeft, Search } from 'lucide-react';
import { auth, db, collection, onSnapshot, query, where, setDoc, doc, deleteDoc } from '../firebase';
import { Task, House } from '../types';

interface TasksListProps {
  boothId: string;
  onBack: () => void;
}

export default function TasksList({ boothId, onBack }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'tasks'),
      where('boothId', '==', boothId),
      where('ownerId', '==', auth.currentUser.uid)
    );
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
  }, [boothId]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'houses'),
      where('boothId', '==', boothId),
      where('ownerId', '==', auth.currentUser.uid)
    );
    return onSnapshot(q, (snap) => {
      setHouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as House)));
    });
  }, [boothId]);

  const handleToggleStatus = async (task: Task) => {
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

  const filteredTasks = tasks.filter(task => {
    const house = houses.find(h => h.id === task.houseId);
    const houseName = house?.name || '';
    const houseNumber = house?.houseNumber || '';
    const searchLower = search.toLowerCase();
    
    const matchesSearch = !search || 
      task.title.toLowerCase().includes(searchLower) ||
      (task.description && task.description.toLowerCase().includes(searchLower)) ||
      houseName.toLowerCase().includes(searchLower) ||
      houseNumber.toLowerCase().includes(searchLower);

    const matchesFilter = filter === 'all' || task.status === filter;

    return matchesSearch && matchesFilter;
  });

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const resolvedCount = tasks.filter(t => t.status === 'resolved').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2.5 rounded-full hover:bg-[#5A5A40]/10 transition-all">
          <ArrowLeft className="w-5 h-5 text-[#5A5A40]" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-sans font-semibold text-[#1a1a1a]">All Tasks</h2>
          <p className="text-[#5A5A40]/50 text-sm">{pendingCount} pending · {resolvedCount} resolved</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A40]/40" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-full border border-black/5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-sans text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filter === 'all' ? 'bg-[#5A5A40] text-white' : 'bg-white border border-black/5 text-[#5A5A40]/60'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-white border border-black/5 text-[#5A5A40]/60'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filter === 'resolved' ? 'bg-green-500 text-white' : 'bg-white border border-black/5 text-[#5A5A40]/60'}`}
          >
            Resolved
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-black/5">
          <ListTodo className="w-12 h-12 text-[#5A5A40]/20 mx-auto mb-4" />
          <p className="text-[#5A5A40]/40 font-sans">No tasks found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          {filteredTasks.map((task, i) => {
            const house = houses.find(h => h.id === task.houseId);
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between px-6 py-5 ${i > 0 ? 'border-t border-black/5' : ''} ${task.status === 'resolved' ? 'opacity-60' : ''}`}
              >
                <div className="flex-1">
                  <p className={`font-sans font-medium text-[#1a1a1a] ${task.status === 'resolved' ? 'line-through' : ''}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-[#5A5A40]/60 mt-1">{task.description}</p>
                  )}
                  {house && (
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40 mt-1">
                      {house.houseNumber} · {house.name}
                    </p>
                  )}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
