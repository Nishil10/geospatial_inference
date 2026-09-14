import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  invalid?: boolean;
  action?: ReactNode; // label row, right-aligned (e.g. "Forgot password?")
  trailing?: ReactNode; // positioned inside the input box (e.g. reveal toggle)
  hint?: ReactNode; // rendered under the input (e.g. caps-lock warning)
};

// Shared by Login and Register so the htmlFor/id pairing and autoComplete
// values cannot drift apart between the two pages.
const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { id, label, invalid, action, trailing, hint, className, ...rest },
  ref
) {
  return (
    <div data-invalid={invalid ? 'true' : undefined}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="gd-label">
          {label}
        </label>
        {action}
      </div>
      <div className="relative mt-2">
        <input
          id={id}
          ref={ref}
          aria-invalid={invalid || undefined}
          className={`gd-input${trailing ? ' pr-11' : ''}${className ? ` ${className}` : ''}`}
          {...rest}
        />
        {/* Order matters: `.gd-input:focus ~ .gd-underline` is a sibling
            combinator, so the underline must follow the input. */}
        <span aria-hidden="true" className="gd-underline" />
        {trailing}
      </div>
      {hint}
    </div>
  );
});

export default Field;
