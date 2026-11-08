/** Marque par défaut Hub Courses (remplaçable par un logo personnalisé). */
export default function Logo() {
  return (
    <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true">
      <defs><linearGradient id="hub-logo" x1="0" x2="1"><stop offset="0" stopColor="var(--cta1)" /><stop offset="1" stopColor="var(--cta2)" /></linearGradient></defs>
      <rect width="48" height="48" rx="15" fill="url(#hub-logo)" />
      <text x="8" y="34" fill="#17110D" fontSize="29" fontWeight="900" fontFamily="system-ui, sans-serif">h.</text>
    </svg>
  );
}
