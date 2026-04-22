"use client";

interface DigitWheelProps {
  value: [number, number, number, number];
  onChange: (digits: [number, number, number, number]) => void;
  disabled?: boolean;
}

function SingleDigit({
  digit,
  index,
  onChange,
  disabled,
}: {
  digit: number;
  index: number;
  onChange: (index: number, value: number) => void;
  disabled?: boolean;
}) {
  const inputId = `digit-${index}`;

  return (
    <div className="dw-slot">
      <button
        type="button"
        className="dw-arrow dw-arrow--up"
        onClick={() => onChange(index, (digit + 1) % 10)}
        disabled={disabled}
      >
        ▲
      </button>

      <label className="dw-viewport" htmlFor={inputId}>
        <input
          id={inputId}
          className="dw-input"
          type="number"
          min={0}
          max={9}
          inputMode="numeric"
          pattern="[0-9]*"
          value={digit}
          disabled={disabled}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isNaN(next)) return;
            onChange(index, Math.max(0, Math.min(9, next)));
          }}
        />
      </label>

      <button
        type="button"
        className="dw-arrow dw-arrow--down"
        onClick={() => onChange(index, (digit + 9) % 10)}
        disabled={disabled}
      >
        ▼
      </button>
    </div>
  );
}

export function DigitWheel({ value, onChange, disabled }: DigitWheelProps) {
  function handleChange(index: number, newDigit: number) {
    const next = [...value] as [number, number, number, number];
    next[index] = newDigit;
    onChange(next);
  }

  return (
    <div className="dw-container">
      {value.map((d, i) => (
        <SingleDigit
          key={i}
          digit={d}
          index={i}
          onChange={handleChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
