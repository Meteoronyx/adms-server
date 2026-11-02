import { createContext, useContext, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const addToast = useCallback((message, type = 'success') => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'success') {
      toast.success(message);
    } else {
      toast(message);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#131416',
            border: '1px solid #e4e7eb',
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: 500,
            padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(19, 20, 22, 0.06)',
          },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
