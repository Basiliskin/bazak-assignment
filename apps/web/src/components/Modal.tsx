import { useEffect, useRef } from 'react';

interface Props {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Native `<dialog>` opened with `showModal()` (D28): the browser gives Esc, the focus trap and the top
 * layer. Mount it to open, unmount to close. Focus returns to whatever was focused before (the card).
 * Bottom sheet below `sm`, centred card above.
 */
export function Modal({ labelledBy, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      // Esc: let React state close it so mount state and the DOM never disagree.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-0 mt-auto mb-0 max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-white p-0 shadow-2xl backdrop:bg-zinc-950/40 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-3xl sm:rounded-3xl"
    >
      <div className="max-h-[92dvh] overflow-y-auto">{children}</div>
    </dialog>
  );
}
