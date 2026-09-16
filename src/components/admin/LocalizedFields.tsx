import type { Localized } from '@/lib/i18n/localized';
export function LocalizedFields({ name, label, value, textarea = false, required = true }: { name: string; label: string; value?: Localized | null; textarea?: boolean; required?: boolean }) {
  const Input = textarea ? 'textarea' : 'input';
  return (
    <fieldset className="border p-2 flex flex-col gap-1">
      <legend>{label}</legend>
      <label>TR <Input name={`${name}.tr`} defaultValue={value?.tr ?? ''} required={required} className="border px-2 py-1 w-full" /></label>
      <label>EN (isteğe bağlı) <Input name={`${name}.en`} defaultValue={value?.en ?? ''} className="border px-2 py-1 w-full" /></label>
    </fieldset>
  );
}
