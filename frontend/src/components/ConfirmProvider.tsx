import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [state, setState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        options,
        resolve,
      });
    });
  };

  const handleCancel = () => {
    if (state) {
      state.resolve(false);
      setState(null);
    }
  };

  const handleConfirm = () => {
    if (state) {
      state.resolve(true);
      setState(null);
    }
  };

  // Icon selector based on confirmation type
  const getIcon = (type?: 'danger' | 'warning' | 'info' | 'success') => {
    switch (type) {
      case 'danger':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
        );
      case 'success':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
            <Info className="h-6 w-6" />
          </div>
        );
    }
  };

  // Button background colors based on confirmation type
  const getConfirmButtonClasses = (type?: 'danger' | 'warning' | 'info' | 'success') => {
    const base = "inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all sm:ml-3 sm:w-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2";
    switch (type) {
      case 'danger':
        return `${base} bg-rose-600 hover:bg-rose-500 focus:ring-rose-500`;
      case 'warning':
        return `${base} bg-amber-600 hover:bg-amber-500 focus:ring-amber-500`;
      case 'success':
        return `${base} bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500`;
      case 'info':
      default:
        return `${base} bg-blue-600 hover:bg-blue-500 focus:ring-blue-500`;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <AnimatePresence>
        {state?.isOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
                onClick={handleCancel}
              />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg dark:bg-gray-950 border border-gray-100 dark:border-gray-900"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 dark:bg-gray-950">
                  <div className="sm:flex sm:items-start">
                    {getIcon(state.options.type)}
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                        {state.options.title}
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {state.options.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions Panel */}
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-gray-900/40 border-t border-gray-50 dark:border-gray-900">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={getConfirmButtonClasses(state.options.type)}
                  >
                    {state.options.confirmText || 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800 dark:hover:bg-gray-800 transition-all focus:outline-none"
                  >
                    {state.options.cancelText || 'Cancel'}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
