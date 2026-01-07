import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AiOutlineClose } from 'react-icons/ai';
interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}
export function Modal({ children, onClose }: ModalProps) {
  useEffect(() => {
    const body = document.querySelector('body');
    if (body) body.style.overflow = 'hidden';
    return () => {
      const body = document.querySelector('body');
      if (body) body.style.overflow = 'auto';
    };
  }, []);
  const handleClose = () => {
    onClose();
  };
  
  const modalContent = (
    <div className="fixed top-0 left-0 w-full h-full bg-black/50 backdrop-blur-sm flex justify-center items-center z-[9999] p-4 overflow-y-auto">
      <div className="relative p-7 rounded-lg shadow-lg bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[10000]">
        <a
          className="close-button absolute top-3 right-3 text-lg cursor-pointer hover:text-primary-600 text-primary-500 z-10"
          onClick={handleClose}
        >
          <AiOutlineClose />
        </a>

        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
