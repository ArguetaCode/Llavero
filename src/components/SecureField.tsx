import { useState } from 'react';

interface SecureFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export function SecureField({ id, label, value, onChange, placeholder, autoComplete }: SecureFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className="secure-field">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" className="icon-button" onClick={() => setIsVisible((current) => !current)}>
          {isVisible ? 'Ocultar' : 'Ver'}
        </button>
      </div>
    </label>
  );
}
