"use client";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** aria-label del grupo (ej. "Cantidad de {café}"). */
  label: string;
  disabled?: boolean;
}

/** Selector de cantidad −/n/+. Botones deshabilitados en los límites. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  disabled = false,
}: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-lg border"
    >
      <button
        type="button"
        aria-label={`Disminuir cantidad de ${label}`}
        className="px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Aumentar cantidad de ${label}`}
        className="px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
