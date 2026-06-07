import { useEffect } from 'react';
import { MdClose } from 'react-icons/md';

// ─── Modal ────────────────────────────────────────────────────────────────────
// Generic modal container. Pass title and children content.
// Closes on overlay click or pressing Escape.
const Modal = ({ title, onClose, children, size = 'md' }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`modal modal--${size}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close modal">
            <MdClose size={20} />
          </button>
        </div>
        <div className="modal__body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
