import { useState } from 'react';
import { query } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Check, X, Search } from 'lucide-react';
import { Agent, AGENTS } from '../constants';
import { cn } from '../report-model';

export function AgentPicker({ value, onChange }: { value: string; onChange: (name: string, re: string, role: string) => void }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');

  const selected = AGENTS.find(a => a.name === value);
  const q = query.trim().toLowerCase();
  const filtered = AGENTS.filter(a =>
    !q ||
    a.display.toLowerCase().includes(q) ||
    a.re.includes(q) ||
    a.role.toLowerCase().includes(q)
  );

  const pick = (a: Agent) => {
    onChange(a.name, a.re, a.role);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Botão de seleção */}
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
        {selected ? (
          <>
            <div className="w-9 h-9 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {selected.display.split(' ').slice(0, 2).map(w => w[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{selected.display}</p>
              <p className="text-xs text-gray-500">{selected.role}{selected.re ? ` · RE ${selected.re}` : ''}</p>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); onChange('', '', ''); }}
              className="p-1 text-gray-400 hover:text-red-400 flex-shrink-0">
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-400">Selecionar responsável pelo preenchimento...</span>
            <ChevronRight size={16} className="text-gray-300 ml-auto flex-shrink-0" />
          </>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Header do modal */}
          <div className="bg-[#1B3A6B] text-white px-4 pt-12 pb-3 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => { setOpen(false); setQuery(''); }} className="p-1 -ml-1">
                <ChevronLeft size={24} />
              </button>
              <p className="font-bold text-base">Preenchido Por</p>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nome, RE ou cargo..."
                className="w-full bg-white/15 text-white placeholder-blue-300 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/20 focus:outline-none" />
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">Nenhum agente encontrado</div>
            )}
            {filtered.map(a => (
              <button key={a.name} type="button" onClick={() => pick(a)}
                className={cn('w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
                  value === a.name ? 'bg-blue-50' : 'bg-white active:bg-gray-50')}>
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                  a.name === 'OUTRO' ? 'bg-gray-100 text-gray-500' : value === a.name ? 'bg-[#1B3A6B] text-white' : 'bg-blue-100 text-[#1B3A6B]')}>
                  {a.name === 'OUTRO' ? '＋' : a.display.split(' ').slice(0, 2).map(w => w[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{a.display}</p>
                  <p className="text-xs text-gray-500">{a.role}{a.re ? ` · RE ${a.re}` : ''}</p>
                </div>
                {value === a.name && <Check size={18} className="text-[#1B3A6B] flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// AGENT MULTI-PICKER — modal de busca com checkboxes
// ─────────────────────────────────────────────

export function AgentMultiPicker({ value, onChange }: { value: string[]; onChange: (names: string[]) => void }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = AGENTS.filter(a =>
    a.role !== '' &&
    (!q || a.display.toLowerCase().includes(q) || a.re.includes(q) || a.role.toLowerCase().includes(q))
  );

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter(n => n !== name) : [...value, name]);
  };

  return (
    <>
      {/* Botão de seleção */}
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-3 bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
        {value.length > 0 ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {value.length === 1
                  ? (AGENTS.find(a => a.name === value[0])?.display ?? value[0])
                  : `${value.length} agentes selecionados`}
              </p>
              {value.length === 1 && (
                <p className="text-xs text-gray-500">{AGENTS.find(a => a.name === value[0])?.role}</p>
              )}
            </div>
            <span className="bg-[#1B3A6B] text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
              {value.length}
            </span>
            <button type="button" onClick={e => { e.stopPropagation(); onChange([]); }}
              className="p-1 text-gray-400 hover:text-red-400 flex-shrink-0">
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-400">Buscar e selecionar agentes...</span>
            <ChevronRight size={16} className="text-gray-300 ml-auto flex-shrink-0" />
          </>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="bg-[#1B3A6B] text-white px-4 pt-12 pb-3 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => { setOpen(false); setQuery(''); }} className="p-1 -ml-1">
                <ChevronLeft size={24} />
              </button>
              <p className="font-bold text-base flex-1">Agentes Participantes</p>
              {value.length > 0 && (
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {value.length} selecionado{value.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nome, RE ou cargo..."
                className="w-full bg-white/15 text-white placeholder-blue-300 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/20 focus:outline-none" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">Nenhum agente encontrado</div>
            )}
            {filtered.map(a => {
              const checked = value.includes(a.name);
              return (
                <button key={a.name} type="button" onClick={() => toggle(a.name)}
                  className={cn('w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
                    checked ? 'bg-blue-50' : 'bg-white active:bg-gray-50')}>
                  <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                    checked ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-300')}>
                    {checked && <Check size={12} className="text-white" />}
                  </div>
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                    checked ? 'bg-[#1B3A6B] text-white' : 'bg-blue-100 text-[#1B3A6B]')}>
                    {a.display.split(' ').slice(0, 2).map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.display}</p>
                    <p className="text-xs text-gray-500">{a.role}{a.re ? ` · RE ${a.re}` : ''}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-4 border-t border-gray-200 bg-white safe-area-pb">
            <button type="button" onClick={() => { setOpen(false); setQuery(''); }}
              className="w-full py-4 rounded-2xl bg-[#1B3A6B] text-white font-bold text-sm">
              Confirmar {value.length > 0 ? `(${value.length})` : ''}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// WIZARD STEPS
// ─────────────────────────────────────────────
