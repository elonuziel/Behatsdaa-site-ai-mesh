import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ClubProvider } from './context/ClubContext';
import { ThemeProvider } from './context/ThemeContext';
import { SearchProvider } from './context/SearchContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { ToastProvider } from './context/ToastContext';
import { ChatProvider } from './context/ChatContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ClubProvider>
        <SearchProvider>
          <FavoritesProvider>
            <ToastProvider>
              <ChatProvider>
                <App />
              </ChatProvider>
            </ToastProvider>
          </FavoritesProvider>
        </SearchProvider>
      </ClubProvider>
    </ThemeProvider>
  </React.StrictMode>
);
