import { useState } from 'react';
import { query } from 'firebase/firestore';
import { Plus, Trash2, Search, FileText, Clock, Moon, Sun, BarChart2, ChevronDown, LogOut, Filter, Download } from 'lucide-react';
import { type RecoveryRecord } from '../sync-recovery';
import { OccurrenceReport } from '../types';
import { OCCURRENCE_TYPES, AGENTS } from '../constants';
import { cn, fmtDate } from '../report-model';
import { Toggle } from '../components/ui';

export function HomeScreen({ ros, onNew, onView, onDelete, onDeleteAll, darkMode, onToggleDark, onSignOut,
  recoveryRecords, onRetryRecovery, syncMessage, bulkDeleteMessage }: {
  ros: OccurrenceReport[];
  onNew: () => void;
  onView: (r: OccurrenceReport) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => Promise<void>;
  darkMode: boolean;
  onToggleDark: () => void;
  onSignOut: () => void;
  recoveryRecords: RecoveryRecord[];
  onRetryRecovery: (id: string) => void;
  syncMessage: string | null;
  bulkDeleteMessage: string | null;
}) {
  const [query, setQuery]           = useState('');
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [showStats, setShowStats]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [bulkBusy, setBulkBusy]     = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = [...ros].reverse().filter(ro => {
    if (q && !(
      ro.roNumber.toLowerCase().includes(q) ||
      ro.occurrenceTypeLabel.toLowerCase().includes(q) ||
      ro.neighborhood.toLowerCase().includes(q) ||
      ro.address.toLowerCase().includes(q) ||
      ro.rgCpf.toLowerCase().includes(q) ||
      ro.reporterName.toLowerCase().includes(q)
    )) return false;
    if (dateFrom && ro.date < dateFrom) return false;
    if (dateTo   && ro.date > dateTo)   return false;
    return true;
  });

  const exportCSV = () => {
    const header = ['Nº R.O.','Data','Tipo','Endereço','Bairro','Preenchido Por','Status','Desfecho'];
    const rows = [...ros].reverse().map(r => [
      r.roNumber, r.date, r.occurrenceTypeLabel,
      [r.address, r.addressNumber].filter(Boolean).join(', '),
      r.neighborhood,
      AGENTS.find(a => a.name === r.agent)?.display ?? r.agent ?? '',
      r.status === 'completed' ? 'Concluído' : 'Rascunho',
      ({ encaminhar: 'Encaminhar', arquivar: 'Arquivar', monitoramento: 'Monitoramento', '': '' } as Record<string,string>)[r.conclusionStatus] ?? '',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ROs_DefesaCivil_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Estatísticas ──
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rosThisMonth = ros.filter(r => r.date.startsWith(thisMonth));
  const completed = ros.filter(r => r.status === 'completed').length;

  const byType = ros.reduce<Record<string, number>>((acc, r) => {
    const k = r.occurrenceTypeLabel || 'Sem tipo';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byAgent = ros.reduce<Record<string, number>>((acc, r) => {
    if (!r.agent) return acc;
    const ag = AGENTS.find(a => a.name === r.agent);
    const k = ag?.display ?? r.agent;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topAgents = Object.entries(byAgent).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byNeighborhood = ros.reduce<Record<string, number>>((acc, r) => {
    if (!r.neighborhood) return acc;
    acc[r.neighborhood] = (acc[r.neighborhood] ?? 0) + 1;
    return acc;
  }, {});
  const topNeighborhoods = Object.entries(byNeighborhood).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Últimos 6 meses
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const count = ros.filter(r => r.date.startsWith(key)).length;
    return { key, label, count };
  });
  const maxMonth = Math.max(...last6Months.map(m => m.count), 1);

  const dk = darkMode;
  const modalBg  = dk ? 'bg-slate-800' : 'bg-white';
  const modalTxt = dk ? 'text-slate-100' : 'text-gray-800';
  const modalSub = dk ? 'text-slate-400' : 'text-gray-500';
  const cardBg   = dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';
  const cardTxt  = dk ? 'text-slate-200' : 'text-gray-700';
  const numClr   = dk ? 'text-blue-300' : 'text-[#1B3A6B]';
  const mutedTxt = dk ? 'text-slate-500' : 'text-gray-400';
  const listBg   = dk ? 'bg-slate-900' : 'bg-gray-50';
  const statBg   = dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';

  return (
    <div className={cn('min-h-screen flex flex-col', listBg)}>
      {/* Header */}
      <div className="bg-[#1B3A6B] text-white">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-black text-white">DC</span>
              </div>
              <div>
                <p className="text-xs text-blue-300 font-medium">Defesa Civil — Cajamar/SP</p>
                <p className="font-bold text-lg leading-tight">Registro de Ocorrências</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Sair */}
              <button type="button" onClick={onSignOut}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                title="Sair">
                <LogOut size={18} className="text-red-300" />
              </button>
              {/* Toggle dark mode */}
              <button type="button" onClick={onToggleDark}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                title={dk ? 'Modo claro' : 'Modo escuro'}>
                {dk ? <Sun size={18} className="text-yellow-300" /> : <Moon size={18} className="text-blue-200" />}
              </button>
              {/* Estatísticas */}
              {ros.length > 0 && (
                <button type="button" onClick={() => setShowStats(s => !s)}
                  className={cn('p-2 rounded-xl transition-colors', showStats ? 'bg-orange-400' : 'bg-white/10 hover:bg-white/20')}
                  title="Estatísticas">
                  <BarChart2 size={18} className="text-white" />
                </button>
              )}
              {/* Excluir todos */}
              {ros.length > 0 && (
                <button type="button" onClick={() => setConfirmAll(true)}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-colors"
                  title="Excluir todos">
                  <Trash2 size={18} className="text-red-300" />
                </button>
              )}
            </div>
          </div>

          {/* Busca */}
          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nº, tipo, bairro, rua, CPF/RG..."
              className="w-full bg-white/10 text-white placeholder-blue-300 rounded-xl pl-9 pr-4 py-2.5 text-sm border border-white/20 focus:outline-none focus:bg-white/20" />
          </div>

          {/* Filtros e Exportar */}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setShowFilters(f => !f)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                showFilters ? 'bg-orange-400 text-white' : 'bg-white/10 text-blue-200 hover:bg-white/20')}>
              <Filter size={13} /> Filtrar por data
              {(dateFrom || dateTo) && <span className="w-2 h-2 bg-orange-300 rounded-full" />}
            </button>
            {ros.length > 0 && (
              <button type="button" onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-blue-200 hover:bg-white/20 transition-colors">
                <Download size={13} /> Exportar CSV
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-2 flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-blue-300 mb-1">De</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-3 py-2 text-sm border border-white/20 focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-blue-300 mb-1">Até</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-3 py-2 text-sm border border-white/20 focus:outline-none" />
              </div>
              {(dateFrom || dateTo) && (
                <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="self-end mb-0.5 px-3 py-2 rounded-xl bg-red-500/30 text-red-200 text-xs font-bold">
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Painel de Estatísticas */}
      {showStats && ros.length > 0 && (
        <div className={cn('mx-4 mt-4 rounded-2xl border shadow-sm overflow-hidden', statBg)}>
          <div className={cn('flex items-center justify-between px-4 pt-4 pb-3 border-b', dk ? 'border-slate-700' : 'border-gray-100')}>
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-orange-500" />
              <span className={cn('font-bold text-sm', dk ? 'text-slate-200' : 'text-gray-800')}>Estatísticas</span>
            </div>
            <button type="button" onClick={() => setShowStats(false)}>
              <ChevronDown size={18} className={mutedTxt} />
            </button>
          </div>

          <div className="px-4 py-4 space-y-5">
            {/* Totais rápidos */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: ros.length, color: 'text-[#1B3A6B]', bg: dk ? 'bg-slate-700' : 'bg-blue-50' },
                { label: 'Este mês', value: rosThisMonth.length, color: 'text-orange-500', bg: dk ? 'bg-slate-700' : 'bg-orange-50' },
                { label: 'Concluídos', value: completed, color: 'text-green-600', bg: dk ? 'bg-slate-700' : 'bg-green-50' },
              ].map(s => (
                <div key={s.label} className={cn('rounded-2xl p-3 text-center', s.bg)}>
                  <p className={cn('text-3xl font-black', s.color)}>{s.value}</p>
                  <p className={cn('text-[10px] font-semibold mt-0.5', mutedTxt)}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Gráfico — R.O.s por mês */}
            <div>
              <p className={cn('text-[10px] font-black uppercase tracking-wider mb-3', mutedTxt)}>R.O.s por mês (últimos 6 meses)</p>
              <div className="flex items-end gap-1.5 h-20">
                {last6Months.map(m => (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                    <span className={cn('text-[9px] font-bold', dk ? 'text-slate-400' : 'text-gray-500')}>{m.count > 0 ? m.count : ''}</span>
                    <div className="w-full rounded-t-lg bg-[#1B3A6B] transition-all"
                      style={{ height: `${Math.max(4, Math.round((m.count / maxMonth) * 56))}px`, opacity: m.count === 0 ? 0.2 : 1 }} />
                    <span className={cn('text-[9px] font-medium capitalize', mutedTxt)}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top tipos */}
            {topTypes.length > 0 && (
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-wider mb-2', mutedTxt)}>Tipos mais frequentes</p>
                <div className="space-y-2">
                  {topTypes.map(([label, count], i) => (
                    <div key={label}>
                      <div className="flex justify-between mb-0.5">
                        <span className={cn('text-xs truncate flex-1 mr-2', dk ? 'text-slate-300' : 'text-gray-700')}>{label}</span>
                        <span className={cn('text-xs font-black', dk ? 'text-slate-400' : 'text-gray-500')}>{count}</span>
                      </div>
                      <div className={cn('h-2 rounded-full overflow-hidden', dk ? 'bg-slate-700' : 'bg-gray-100')}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((count / ros.length) * 100)}%`,
                            backgroundColor: ['#1B3A6B','#f97316','#22c55e','#8b5cf6','#ef4444'][i] ?? '#1B3A6B',
                          }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top bairros */}
            {topNeighborhoods.length > 0 && (
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-wider mb-2', mutedTxt)}>Bairros com mais ocorrências</p>
                <div className="space-y-1.5">
                  {topNeighborhoods.map(([name, count], i) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-black w-4 text-center', dk ? 'text-slate-500' : 'text-gray-400')}>{i + 1}</span>
                      <span className={cn('text-xs flex-1 truncate', dk ? 'text-slate-300' : 'text-gray-700')}>{name}</span>
                      <span className={cn('text-xs font-black px-2 py-0.5 rounded-full', dk ? 'bg-slate-700 text-orange-400' : 'bg-orange-100 text-orange-700')}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top agentes */}
            {topAgents.length > 0 && (
              <div>
                <p className={cn('text-[10px] font-black uppercase tracking-wider mb-2', mutedTxt)}>Agentes com mais registros</p>
                <div className="space-y-1.5">
                  {topAgents.map(([name, count], i) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-black w-4 text-center', dk ? 'text-slate-500' : 'text-gray-400')}>{i + 1}</span>
                      <span className={cn('text-xs flex-1 truncate', dk ? 'text-slate-300' : 'text-gray-700')}>{name}</span>
                      <span className={cn('text-xs font-black px-2 py-0.5 rounded-full', dk ? 'bg-slate-700 text-blue-400' : 'bg-blue-100 text-[#1B3A6B]')}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 p-4 pb-28">
        {(syncMessage || bulkDeleteMessage) && (
          <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
            {syncMessage || bulkDeleteMessage}
          </div>
        )}
        {recoveryRecords.length > 0 && (
          <section className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <h2 className="text-sm font-black text-red-800">R.O.s aguardando correção e reenvio ({recoveryRecords.length})</h2>
            <p className="mt-1 text-xs text-red-700">Cópias guardadas neste aparelho; o servidor não confirmou esses registros.</p>
            <div className="mt-3 space-y-2">
              {recoveryRecords.map(item => (
                <div key={item.roId} className="rounded-xl bg-white p-3">
                  <p className="text-xs font-bold text-gray-800">R.O. {String(item.steps.at(-1)?.report.roNumber || 'sem número')}</p>
                  <p className="mt-1 break-words text-[11px] text-gray-600">{item.reason}</p>
                  <button type="button" onClick={() => onRetryRecovery(item.roId)}
                    className="mt-2 rounded-lg bg-[#1B3A6B] px-3 py-2 text-xs font-bold text-white">
                    Tentar sincronizar
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        {ros.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={52} className={cn('mx-auto mb-4', mutedTxt)} />
            <p className={cn('font-semibold', mutedTxt)}>Nenhum R.O. registrado</p>
            <p className={cn('text-sm mt-1', mutedTxt)}>Toque em "+ Novo R.O." para começar</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search size={40} className={cn('mx-auto mb-3', mutedTxt)} />
            <p className={cn('font-semibold', mutedTxt)}>Nenhum resultado</p>
            <p className={cn('text-sm mt-1', mutedTxt)}>Tente outros termos de busca</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className={cn('text-[11px] font-bold uppercase tracking-wider', mutedTxt)}>
              {q ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}` : `Registros (${ros.length})`}
            </p>
            {filtered.map(ro => {
              const type = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);
              const conclusionColors: Record<string, string> = {
                encaminhar: 'bg-blue-100 text-blue-700',
                arquivar: 'bg-green-100 text-green-700',
                monitoramento: 'bg-orange-100 text-orange-700',
              };
              const conclusionLabels: Record<string, string> = {
                encaminhar: 'Encaminhar', arquivar: 'Arquivado', monitoramento: 'Monitoramento',
              };
              return (
                <div key={ro.id} className="relative">
                  <button type="button" onClick={() => onView(ro)}
                    className={cn('w-full rounded-2xl p-4 shadow-sm border text-left flex items-start gap-3 active:opacity-80 pr-14', cardBg)}>
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl', dk ? 'bg-slate-700' : 'bg-blue-50')}>
                      {type?.emoji ?? '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                        <span className={cn('font-bold text-sm', numClr)}>
                          {ro.needsNumber ? '⏳ Aguardando nº' : `R.O. ${ro.roNumber}`}
                        </span>
                        <div className="flex gap-1.5">
                          {ro.conclusionStatus && (
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', conclusionColors[ro.conclusionStatus] ?? '')}>
                              {conclusionLabels[ro.conclusionStatus] ?? ''}
                            </span>
                          )}
                          <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-semibold',
                            ro.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                            {ro.status === 'completed' ? 'Concluído' : 'Rascunho'}
                          </span>
                        </div>
                      </div>
                      <p className={cn('text-sm font-medium truncate', cardTxt)}>
                        {ro.occurrenceTypeLabel || 'Tipo não definido'}
                      </p>
                      <div className={cn('flex items-center gap-3 mt-1 text-xs', mutedTxt)}>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {fmtDate(ro.date)} {ro.startTime && `às ${ro.startTime}`}
                        </span>
                        {ro.neighborhood && <span className="truncate">{ro.neighborhood}</span>}
                      </div>
                    </div>
                  </button>
                  <button type="button" onClick={() => setConfirmId(ro.id)}
                    className={cn('absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors', mutedTxt, 'hover:text-red-400')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 left-4 right-4">
        <button type="button" onClick={onNew}
          className="w-full bg-[#1B3A6B] text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base active:bg-[#142d52]">
          <Plus size={22} /> Novo R.O.
        </button>
      </div>

      {/* Modal — excluir individual */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className={cn('rounded-2xl p-6 w-full max-w-sm shadow-xl', modalBg)}>
            <p className={cn('font-bold text-base mb-2', modalTxt)}>Excluir este R.O.?</p>
            <p className={cn('text-sm mb-5', modalSub)}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmId(null)}
                className={cn('flex-1 py-3 rounded-xl border-2 font-semibold text-sm', dk ? 'border-slate-600 text-slate-300' : 'border-gray-200 text-gray-600')}>
                Cancelar
              </button>
              <button type="button" onClick={() => { onDelete(confirmId); setConfirmId(null); }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — excluir todos */}
      {confirmAll && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className={cn('rounded-2xl p-6 w-full max-w-sm shadow-xl', modalBg)}>
            <p className={cn('font-bold text-base mb-2', modalTxt)}>Excluir todos os R.O.s?</p>
            <p className={cn('text-sm mb-5', modalSub)}>Todos os {ros.length} registros serão apagados permanentemente.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmAll(false)}
                className={cn('flex-1 py-3 rounded-xl border-2 font-semibold text-sm', dk ? 'border-slate-600 text-slate-300' : 'border-gray-200 text-gray-600')}>
                Cancelar
              </button>
              <button type="button" disabled={bulkBusy}
                onClick={async () => { setBulkBusy(true); try { await onDeleteAll(); setConfirmAll(false); } catch { /* mensagem detalhada exibida na tela */ } finally { setBulkBusy(false); } }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm disabled:opacity-50">
                {bulkBusy ? 'Excluindo…' : 'Excluir Todos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW R.O.
// ─────────────────────────────────────────────
