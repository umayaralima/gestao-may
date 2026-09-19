import { cn } from "@/lib/cn";

/*
 * Input do guia "May": borda 2px neutro-100, texto neutro-800, foco neutro-800,
 * desabilitado com fundo input-fundo-disabled. Radius 4px.
 */
const campo =
  "w-full rounded-smaller border-2 border-neutro-100 bg-branco px-3 py-2 text-sm text-neutro-800 " +
  "placeholder:text-neutro-400 transition-colors focus:border-neutro-800 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-input-disabled disabled:text-neutro-100";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(campo, className)} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(campo, "min-h-24 resize-y", className)} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(campo, "bg-branco", className)}>
      {children}
    </select>
  );
}

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...props} className={cn("mb-1.5 block text-sm font-medium text-neutro-700", className)}>
      {children}
    </label>
  );
}

export function Campo({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutro-500">{hint}</p>}
    </div>
  );
}
