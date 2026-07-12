import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ConfirmProvider } from './components/ConfirmProvider.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </AuthProvider>
  </StrictMode>,
);
