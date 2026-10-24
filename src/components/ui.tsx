import { Check } from 'lucide-react';
import { cn } from '../report-model';

export function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={!active ? { backgroundColor: 'var(--border)', color: 'var(--text-main)' } : undefined}
      className={cn('flex-1 py-3 text-sm font-semibold rounded-xl transition-all',
        active ? 'bg-[#1B3A6B] text-white shadow-sm' : 'active:opacity-80')}>
      {label}
    </button>
  );
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label style={{ color: 'var(--text-main)' }} className="block text-xs font-bold uppercase tracking-wider opacity-90">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = 'text', inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <input type={type} inputMode={inputMode} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-4 py-3 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none" />
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
        checked ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-400')}
        style={!checked ? { backgroundColor: 'var(--bg-card)' } : undefined}>
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </div>
      <span style={{ color: 'var(--text-main)' }} className="text-sm font-semibold">{label}</span>
    </label>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      className={cn('rounded-2xl p-4 shadow-sm border transition-colors', className)}
    >
      {children}
    </div>
  );
}

export function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--text-main)' }} className="text-[11px] font-bold uppercase tracking-widest mb-3 opacity-80">
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────
// DYNAMIC SECTIONS
// ─────────────────────────────────────────────
