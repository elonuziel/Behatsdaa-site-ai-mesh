import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClubId, CLUBS } from '../types/club';

export function formatClubDate(dateStr?: string | null): string {
  if (!dateStr) return 'לא זמין';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

interface ClubContextType {
  activeClubs: Set<ClubId>;
  toggleClub: (clubId: ClubId) => void;
  isClubActive: (clubId: ClubId) => boolean;
  setClubActive: (clubId: ClubId, active: boolean) => void;
  resetAllClubs: () => void;
  lastUpdated: Record<ClubId, string>;
  lastUpdatedFormatted: Record<ClubId, string>;
  getClubLastUpdated: (clubId: ClubId) => string;
  getClubLastUpdatedFormatted: (clubId: ClubId) => string;
}

const STORAGE_KEY = 'my_active_clubs';
const DEFAULT_CLUBS: ClubId[] = ['behatsdaa', 'uniq', 'mastercard'];

const DEFAULT_LAST_UPDATED: Record<ClubId, string> = {
  behatsdaa: CLUBS.behatsdaa.lastUpdated,
  uniq: CLUBS.uniq.lastUpdated,
  mastercard: CLUBS.mastercard.lastUpdated
};

const DEFAULT_LAST_UPDATED_FORMATTED: Record<ClubId, string> = {
  behatsdaa: CLUBS.behatsdaa.lastUpdatedFormatted,
  uniq: CLUBS.uniq.lastUpdatedFormatted,
  mastercard: CLUBS.mastercard.lastUpdatedFormatted
};

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

  const [lastUpdated, setLastUpdated] = useState<Record<ClubId, string>>(DEFAULT_LAST_UPDATED);
  const [lastUpdatedFormatted, setLastUpdatedFormatted] = useState<Record<ClubId, string>>(DEFAULT_LAST_UPDATED_FORMATTED);

  // Synchronize dynamic feed timestamps from static index if available
  useEffect(() => {
    let isMounted = true;
    const base = import.meta.env.BASE_URL || '/';
    const indexUrl = `${base}data/search-index.json`.replace('//', '/');

    fetch(indexUrl)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!isMounted || !data?.metadata?.clubs_last_updated) return;
        const clubsMeta = data.metadata.clubs_last_updated as Partial<Record<ClubId, string>>;
        const updated: Record<ClubId, string> = {
          behatsdaa: clubsMeta.behatsdaa || DEFAULT_LAST_UPDATED.behatsdaa,
          uniq: clubsMeta.uniq || DEFAULT_LAST_UPDATED.uniq,
          mastercard: clubsMeta.mastercard || DEFAULT_LAST_UPDATED.mastercard
        };
        const formatted: Record<ClubId, string> = {
          behatsdaa: formatClubDate(updated.behatsdaa),
          uniq: formatClubDate(updated.uniq),
          mastercard: formatClubDate(updated.mastercard)
        };
        setLastUpdated(updated);
        setLastUpdatedFormatted(formatted);
      })
      .catch(() => {
        // Fall back gracefully to built-in timestamps
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const getClubLastUpdated = (clubId: ClubId) => lastUpdated[clubId] || DEFAULT_LAST_UPDATED[clubId];
  const getClubLastUpdatedFormatted = (clubId: ClubId) =>
    lastUpdatedFormatted[clubId] || DEFAULT_LAST_UPDATED_FORMATTED[clubId];

  return (
    <ClubContext.Provider
      value={{
        activeClubs,
        toggleClub,
        isClubActive,
        setClubActive,
        resetAllClubs,
        lastUpdated,
        lastUpdatedFormatted,
        getClubLastUpdated,
        getClubLastUpdatedFormatted
      }}
    >
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
