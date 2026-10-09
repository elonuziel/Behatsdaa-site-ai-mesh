import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ClubProvider } from './context/ClubContext';
import { ThemeProvider } from './context/ThemeContext';
import { SearchProvider } from './context/SearchContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ClubProvider>
        <SearchProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SearchProvider>
      </ClubProvider>
    </ThemeProvider>
  </React.StrictMode>
);
