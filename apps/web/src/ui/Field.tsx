import { Eye, EyeOff } from "lucide-react";
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { IconButton } from "./Button.js";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {error ? (
        <span className="error-text">{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`input ${className ?? ""}`} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...rest} className={`select ${className ?? ""}`}>
      {children}
    </select>
  );
}

export function SecretInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="secret">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
      />
      <IconButton
        className="secret-toggle"
        size="sm"
        icon={visible ? EyeOff : Eye}
        label={visible ? "Hide" : "Show"}
        onClick={() => setVisible((current) => !current)}
      />
    </div>
  );
}
