import { createContext, useContext, useState, useCallback } from 'react';
import ConfirmDialog from '../components/common/ConfirmDialog/ConfirmDialog';

// Dialogi potwierdzenia
const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState(null);

  // Wywołaj potwierdzenie
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        resolve,
      });
    });
  }, []);

  const close = useCallback(() => {
    setConfirmState(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {confirmState && (
        <ConfirmDialog
          {...confirmState}
          onClose={close}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm musi być używany wewnątrz ConfirmProvider');
  }
  return context;
};
