"use client";

/**
 * Display primitives shared by the nomination letter and the scholarship
 * agreement. Values merged from the database render read-only; values the
 * coordinator fills in render as inputs.
 */

export const letterParagraphClass = "text-sm leading-7 text-slate-800";
export const detailLabelClass = "text-sm font-bold text-slate-900";

const controlClass =
  "rounded border border-slate-300 bg-white px-2 py-0.5 align-baseline text-sm font-semibold text-slate-900 outline-none focus:border-[#062763] focus:ring-2 focus:ring-[#062763]/15 disabled:opacity-50";

/** Read-only value merged in from the database. */
export function AutoValue({
  value,
  missingLabel = "—",
}: {
  value: string;
  missingLabel?: string;
}) {
  const text = value?.trim();
  if (!text) {
    return <span className="font-semibold text-slate-500">{missingLabel}</span>;
  }
  return <span className="font-semibold text-slate-900">{text}</span>;
}

export function EmailLink({
  value,
  missingLabel = "—",
}: {
  value: string;
  missingLabel?: string;
}) {
  const email = value?.trim();
  if (!email) {
    return <span className="font-semibold text-slate-500">{missingLabel}</span>;
  }
  return (
    <a
      href={`mailto:${email}`}
      className="font-semibold text-blue-700 underline"
    >
      {email}
    </a>
  );
}

export function EditableInput({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
  width = "12rem",
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
  width?: string;
  type?: "text" | "date";
}) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        style={{ width }}
        className={controlClass}
      />
    </>
  );
}

export function EditableSelect({
  id,
  label,
  value,
  options,
  optionValues,
  onChange,
  disabled,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  /** Optional stable values; defaults to using each option label as its value. */
  optionValues?: readonly string[];
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
  className?: string;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${controlClass}${className ? ` ${className}` : ""}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option, index) => {
          const optionValue = optionValues?.[index] ?? option;
          return (
            <option key={optionValue} value={optionValue}>
              {option}
            </option>
          );
        })}
      </select>
    </>
  );
}
