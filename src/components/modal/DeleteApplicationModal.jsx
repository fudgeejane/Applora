import { useEffect, useRef } from "react";
import Portal from "../ui/Portal";

export default function DeleteApplicationModal({ application, style, onClose, onConfirm }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.querySelector("button")?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = [...(dialogRef.current?.querySelectorAll("button:not([disabled])") || [])];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <Portal>
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="alertdialog"
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="delete-application-title"
        aria-describedby="delete-application-description"
        className={`w-full max-w-md rounded-xl border p-5 ${style.border} ${style.secondaryBg}`}
      >
        <h2 id="delete-application-title" className={`text-lg font-semibold ${style.primaryText}`}>
          Delete application?
        </h2>
        <p id="delete-application-description" className={`mt-2 text-sm leading-6 ${style.secondaryText}`}>
          This will permanently delete <span className={style.primaryText}>{application.role}</span> at{" "}
          <span className={style.primaryText}>{application.company}</span>. This action cannot be undone.
        </p>
        <div className={`mt-6 flex justify-end gap-2  pt-4 ${style.border}`}>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${style.border} ${style.secondaryText} ${style.hoverBg}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Delete application
          </button>
        </div>
      </section>
    </div>
    </Portal>
  );
}
