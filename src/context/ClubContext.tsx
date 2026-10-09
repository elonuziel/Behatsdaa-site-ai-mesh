import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClubId } from '../types/club';

interface ClubContextType {
  activeClubs: Set<ClubId>;
  toggleClub: (clubId: ClubId) => void;
  isClubActive: (clubId: ClubId) => boolean;
  setClubActive: (clubId: ClubId, active: boolean) => void;
  resetAllClubs: () => void;
}

const STORAGE_KEY = 'my_active_clubs';
const DEFAULT_CLUBS: ClubId[] = ['behatsdaa', 'uniq', 'mastercard'];

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const ClubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeClubs, setActiveClubs] = useState<Set<ClubId>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Set<ClubId>(parsed as ClubId[]);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved active clubs from localStorage', e);
    }
    return new Set<ClubId>(DEFAULT_CLUBS);
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(activeClubs)));
    } catch (e) {
      console.warn('Failed to save active clubs to localStorage', e);
    }
  }, [activeClubs]);

  const toggleClub = (clubId: ClubId) => {
    setActiveClubs(prev => {
      const next = new Set(prev);
      if (next.has(clubId)) {
        // Prevent deselecting all clubs (at least 1 club must remain selected)
        if (next.size > 1) {
          next.delete(clubId);
        }
      } else {
        next.add(clubId);
      }
      return next;
    });
  };

  const setClubActive = (clubId: ClubId, active: boolean) => {
    setActiveClubs(prev => {
      const next = new Set(prev);
      if (active) {
        next.add(clubId);
      } else if (next.size > 1) {
        next.delete(clubId);
      }
      return next;
    });
  };

  const isClubActive = (clubId: ClubId) => activeClubs.has(clubId);

  const resetAllClubs = () => setActiveClubs(new Set(DEFAULT_CLUBS));

  return (
    <ClubContext.Provider value={{ activeClubs, toggleClub, isClubActive, setClubActive, resetAllClubs }}>
      {children}
    </ClubContext.Provider>
  );
};

export const useClubs = () => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClubs must be used within a ClubProvider');
  }
  return context;
};
