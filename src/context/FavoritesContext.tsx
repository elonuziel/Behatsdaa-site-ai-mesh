import React, { createContext, useContext, useState, useEffect } from 'react';

interface FavoritesContextType {
  isFavorite: (type: 'store' | 'deal', id: string) => boolean;
  toggleFavorite: (type: 'store' | 'deal', id: string) => void;
  clearAllFavorites: () => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (show: boolean) => void;
  favoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'behatsdaa_favorites_v2';

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load favorites from localStorage', e);
    }
    return new Set();
  });

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(favorites)));
    } catch (e) {
      console.warn('Failed to save favorites to localStorage', e);
    }
  }, [favorites]);

  const isFavorite = (type: 'store' | 'deal', id: string) => {
    return favorites.has(`${type}_${id}`);
  };

  const toggleFavorite = (type: 'store' | 'deal', id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      const key = `${type}_${id}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const clearAllFavorites = () => {
    setFavorites(new Set());
  };

  return (
    <FavoritesContext.Provider
      value={{
        isFavorite,
        toggleFavorite,
        clearAllFavorites,
        showFavoritesOnly,
        setShowFavoritesOnly,
        favoritesCount: favorites.size
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
