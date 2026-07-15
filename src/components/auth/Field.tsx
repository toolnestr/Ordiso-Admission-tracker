export default function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-muted-strong">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted focus:border-border-strong"
      />
    </label>
  );
}
