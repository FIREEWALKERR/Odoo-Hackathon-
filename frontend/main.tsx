import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../Odoo-Hackathon-/Odoo-Hackathon-/frontend/App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
