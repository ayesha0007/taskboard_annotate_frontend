import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import clsx from "clsx";

const baseClasses =
  "w-full bg-surface border border-border rounded-card px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent outline-none transition-colors";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={clsx(baseClasses, className)} {...rest} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea className={clsx(baseClasses, "resize-none", className)} {...rest} />;
}
