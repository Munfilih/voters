export interface House {
  id: string;
  boothId: string;
  ownerId: string;
  name: string;
  nameMl?: string;
  houseNumber: string;
  phone?: string;
  secondaryPhone?: string;
  road?: string;
  mainVoterId?: string;
  photoURL?: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  houseId: string;
  boothId: string;
  ownerId: string;
  title: string;
  description?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface Booth {
  id: string;
  name: string;
  ward: string;
  panchayath: string;
  niyamasabha: string;
  lokasabha: string;
  ownerId: string;
}

export interface Voter {
  id: string;
  boothId: string;
  ownerId: string;
  serialNumber?: number;
  name: string;
  nameMl?: string;
  age: number;
  birthYear?: number;
  gender: 'Male' | 'Female' | 'Other';
  voterId: string;
  address: string;
  houseNumber?: string;
  guardianName?: string;
  guardianNameMl?: string;
  guardianRelation?: string;
  phone?: string;
  category?: 'General' | 'OBC' | 'SC' | 'ST';
  incomeLevel?: 'Low' | 'Medium' | 'High';
  isVerified?: boolean;
  photoURL?: string;
  supportRating?: number;
  createdAt?: any;
}

export type View = 'booth-selection' | 'dashboard' | 'voter-list' | 'add-voter' | 'houses' | 'profile' | 'tasks';
