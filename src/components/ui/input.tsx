import { cn } from "@/lib/cn";

/*
 * Input no tema escuro: superfície lavanda-600, borda lavanda-400 fina, texto lavanda-50,
 * foco com borda rosa-600. Radius 8px como no wireframe.
 */
const campo =
  "w-full rounded-[8px] border border-borda bg-superficie-2 px-3 py-2 text-sm text-texto " +
  "placeholder:text-texto-mudo/70 transition-colors focus:border-rosa-600 focus:outline-none focus:ring-2 focus:ring-rosa-600/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(campo, className)} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(campo, "min-h-24 resize-y", className)} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(campo, className)}>
      {children}
    </select>
  );
}

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...props} className={cn("mb-1.5 block text-xs font-medium text-texto-suave", className)}>
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
      {hint && <p className="mt-1 text-xs text-texto-mudo">{hint}</p>}
    </div>
  );
}
