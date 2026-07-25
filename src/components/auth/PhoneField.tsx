"use client";

import { useState } from "react";
import { DIAL_CODES, DEFAULT_DIAL_ISO } from "@/lib/dialCodes";

/**
 * Mobile number input: a native <select> of every country dial code paired
 * with the national number. Two form fields (`phone_cc` + `phone_national`)
 * that the register action combines into one E.164 string. Native <select>
 * keeps it a few KB with no phone library — see lib/dialCodes.
 */
export default function PhoneField({
  label = "Mobile number",
  required = true,
}: {
  label?: string;
  required?: boolean;
}) {
  const [iso, setIso] = useState(DEFAULT_DIAL_ISO);
  const selected = DIAL_CODES.find((c) => c.iso === iso) ?? DIAL_CODES[0];

  return (
    <label className="block">
      <span className="text-[13px] font-medium text-muted-strong">{label}</span>
      <div className="mt-1.5 flex gap-2">
        {/* Country code. name maps the ISO back to a dial code server-side. */}
        <select
          name="phone_cc"
          value={iso}
          onChange={(e) => setIso(e.target.value)}
          aria-label="Country code"
          className="surface-2 w-[7.5rem] shrink-0 rounded-lg px-2 py-2.5 text-[14px] text-foreground outline-none transition-colors focus:border-border-strong"
        >
          {DIAL_CODES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>

        <input
          name="phone_national"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          placeholder="300 1234567"
          className="surface-2 block w-full rounded-lg px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted focus:border-border-strong"
        />
      </div>
      <span className="mt-1 block text-[11.5px] text-muted">
        {selected.flag} {selected.name} ({selected.dial})
      </span>
    </label>
  );
}
