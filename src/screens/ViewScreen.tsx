import { useState } from 'react';
import { ChevronLeft, X, AlertTriangle, Printer, Pencil, History, Share2, Mail, MessageCircle } from 'lucide-react';
import { type AuditEntry } from '../audit-log';
import { OccurrenceReport } from '../types';
import { OCCURRENCE_TYPES } from '../constants';
import { cn, fmtDate } from '../report-model';
import { Card, SecTitle } from '../components/ui';

export function ShareModal({ ro, onClose }: { ro: OccurrenceReport; onClose: () => void }) {
  const cleanPhone = (ro.phone ?? '').replace(/\D/g, '');
  const hasWhatsApp = cleanPhone.length >= 10;
  const hasEmail = !!(ro.reporterEmail ?? '').trim();

  const summary = [
    `📋 *R.O. ${ro.roNumber} — Defesa Civil Cajamar*`,
    `📅 Data: ${fmtDate(ro.date)} | ${ro.startTime}${ro.endTime ? ' – ' + ro.endTime : ''}`,
    ro.occurrenceTypeLabel ? `🔖 Tipo: ${ro.occurrenceTypeLabel}` : '',
    ro.address ? `📍 Endereço: ${[ro.address, ro.addressNumber, ro.neighborhood].filter(Boolean).join(', ')}` : '',
    ro.reporterName ? `👤 Solicitante: ${ro.reporterName}` : '',
    ro.conclusionStatus ? `✅ Desfecho: ${{ encaminhar: 'Encaminhar', arquivar: 'Arquivar/Finalizado', monitoramento: 'Monitoramento' }[ro.conclusionStatus] ?? ro.conclusionStatus}` : '',
    ro.conclusion ? `📝 ${ro.conclusion}` : '',
  ].filter(Boolean).join('\n');

  const sendWhatsApp = () => {
    const phone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(summary)}`, '_blank');
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(`R.O. ${ro.roNumber} — Defesa Civil Cajamar`);
    const body = encodeURIComponent(summary);
    window.open(`mailto:${ro.reporterEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Share2 size={18} className="text-[#1B3A6B]" /> Compartilhar R.O.
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          {hasWhatsApp ? (
            <button type="button" onClick={sendWhatsApp}
              className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-3 active:opacity-80">
              <MessageCircle size={20} /> Enviar por WhatsApp
              <span className="text-xs font-normal opacity-80">{ro.phone}</span>
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 text-sm flex items-center justify-center gap-2">
              <MessageCircle size={18} /> WhatsApp — telefone não informado
            </div>
          )}
          {hasEmail ? (
            <button type="button" onClick={sendEmail}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-3 active:opacity-80">
              <Mail size={20} /> Enviar por E-mail
              <span className="text-xs font-normal opacity-80">{ro.reporterEmail}</span>
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 text-sm flex items-center justify-center gap-2">
              <Mail size={18} /> E-mail — não informado
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-4">
          {hasWhatsApp || hasEmail ? 'Selecione como deseja enviar o resumo do R.O.' : 'Preencha telefone ou e-mail do solicitante para compartilhar.'}
        </p>
      </div>
    </div>
  );
}

export function ViewROScreen({ ro, onBack, onPrint, onEdit, auditEvents, syncState }: {
  ro: OccurrenceReport; onBack: () => void; onPrint: () => void; onEdit: () => void;
  auditEvents: AuditEntry[]; syncState?: 'pending' | 'confirmed' | 'rejected';
}) {
  const [showShare, setShowShare] = useState(false);
  const type = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);

  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="mb-3">
      <SecTitle>{title}</SecTitle>
      {children}
    </Card>
  );

  const Row = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 gap-2">
        <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
        <span className="text-xs font-semibold text-gray-800 text-right">{value}</span>
      </div>
    ) : null;

  const selectedAgencies = ro.agencies.filter(a => a.selected);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#1B3A6B] text-white sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={onBack} className="p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-blue-300">R.O. {ro.roNumber}</p>
            <p className="font-bold text-sm truncate">{ro.occurrenceTypeLabel || 'Ocorrência'}</p>
          </div>
          <span className={cn('text-[11px] px-2.5 py-1 rounded-full font-semibold',
            ro.status === 'completed' ? 'bg-green-500/25 text-green-200' : 'bg-yellow-500/25 text-yellow-200')}>
            {ro.status === 'completed' ? 'Concluído' : 'Rascunho'}
          </span>
        </div>
      </div>

      <div className="p-4 pb-10">
        {syncState && (
          <div className={cn('mb-3 rounded-xl p-3 text-xs font-bold',
            syncState === 'confirmed' ? 'bg-green-100 text-green-800' :
              syncState === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900')}>
            {syncState === 'confirmed' ? '✓ R.O. confirmado pelo servidor.' :
              syncState === 'rejected' ? '⚠ R.O. rejeitado pelo servidor. Acesse a tela inicial para recuperar e reenviar.' :
                '⏳ Sincronização pendente; aguardando confirmação do servidor.'}
          </div>
        )}
        {ro.emergency && (
          <div className="bg-red-500 text-white rounded-2xl p-3 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} />
            <span className="font-bold text-sm">EMERGÊNCIA</span>
          </div>
        )}

        <Sec title="Identificação">
          <Row label="Nº do R.O." value={ro.roNumber} />
          <Row label="Data"        value={fmtDate(ro.date)} />
          <Row label="Hora inicial" value={ro.startTime} />
          <Row label="Hora final"   value={ro.endTime} />
          <Row label="Viatura"      value={ro.vehicle} />
          <Row label="Preenchido Por" value={ro.agent ? `${ro.agent}${ro.re ? ` (RE: ${ro.re})` : ''}` : null} />
          <Row label="Origem"       value={ro.origin} />
        </Sec>

        <Sec title="Solicitante">
          <Row label="Nome"      value={ro.reporterName} />
          <Row label="RG/CPF"   value={ro.rgCpf} />
          <Row label="Telefone" value={ro.phone} />
          <Row label="E-mail"   value={ro.reporterEmail} />
          <Row label="Endereço" value={[ro.address, ro.addressNumber].filter(Boolean).join(', ')} />
          <Row label="Bairro"   value={ro.neighborhood} />
        </Sec>

        <Sec title="Ocorrência">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{type?.emoji ?? '📋'}</span>
            <span className="text-sm font-bold text-gray-800">{ro.occurrenceTypeLabel}</span>
          </div>
          <Row label="Área de risco" value={ro.riskArea} />
          {ro.cobrade?.active && ro.cobrade.code && (
            <Row label="COBRADE" value={`${ro.cobrade.code} — ${ro.cobrade.label}`} />
          )}
        </Sec>

        {selectedAgencies.length > 0 && (
          <Sec title="Apoio Acionado">
            {selectedAgencies.map(a => (
              <Row key={a.id} label={a.label}
                value={[a.vehicles, a.responsible].filter(Boolean).join(' — ') || 'Acionado'} />
            ))}
          </Sec>
        )}

        {ro.observations && (
          <Sec title="Observações">
            <p className="text-sm text-gray-700 leading-relaxed">{ro.observations}</p>
          </Sec>
        )}

        {ro.photos.length > 0 && (
          <Sec title={`Registro Fotográfico (${ro.photos.length} foto${ro.photos.length > 1 ? 's' : ''})`}>
            {ro.photoScenario && (
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">{ro.photoScenario}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {ro.photos.map((photo, idx) => (
                <div key={photo.id}>
                  <img src={photo.dataUrl} alt={`Foto ${idx + 1}`}
                    className="w-full h-36 object-cover rounded-xl" />
                  {photo.caption && (
                    <p className="text-[11px] text-gray-500 mt-1 text-center leading-tight">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </Sec>
        )}

        {(ro.conclusion || ro.conclusionStatus) && (
          <Sec title="Desfecho / Conclusão">
            {ro.conclusionStatus && (() => {
              const map: Record<string, string> = { encaminhar: 'bg-blue-100 text-blue-700', arquivar: 'bg-green-100 text-green-700', pendente: 'bg-yellow-100 text-yellow-700', monitoramento: 'bg-orange-100 text-orange-700' };
              const labels: Record<string, string> = { encaminhar: 'Encaminhar', arquivar: 'Arquivar / Finalizado', pendente: 'Pendente', monitoramento: 'Monitoramento' };
              return (
                <div className="mb-2">
                  <span className={cn('text-xs font-bold px-3 py-1 rounded-full', map[ro.conclusionStatus] ?? '')}>{labels[ro.conclusionStatus] ?? ''}</span>
                  {ro.conclusionStatus === 'encaminhar' && (ro.encaminharDest ?? []).length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">→ {(ro.encaminharDest ?? []).join(', ')}</p>
                  )}
                </div>
              );
            })()}
            {ro.conclusion && <p className="text-sm text-gray-700 leading-relaxed">{ro.conclusion}</p>}
          </Sec>
        )}

        <Sec title="Assinaturas">
          <Row label="Declarante" value={[ro.declarant1, ro.declarant1Role].filter(Boolean).join(' — ')} />
          {(ro.agentParticipants ?? []).length > 0 && (
            <Row label="Agentes Participantes" value={(ro.agentParticipants ?? []).join(', ')} />
          )}
          <Row label="Preenchido por" value={[ro.filledBy, ro.role].filter(Boolean).join(' — ')} />
        </Sec>

        {(auditEvents.length > 0 || (ro.editHistory ?? []).length > 0) && (
          <Sec title="Histórico de alterações">
            <div className="space-y-2">
              {(auditEvents.length > 0
                ? [...auditEvents].reverse().map(event => ({
                    at: event.at,
                    by: event.agentName,
                    action: ({
                      ro_draft_created: 'Rascunho criado', ro_saved: 'R.O. salvo',
                      ro_edited: 'R.O. editado', ro_number_assigned: 'Número definitivo atribuído',
                      ro_deleted: 'R.O. excluído',
                    } as Record<string, string>)[event.action] ?? event.action,
                  }))
                : [...(ro.editHistory ?? [])].reverse()
              ).map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <History size={12} className="text-[#1B3A6B]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{h.action}</p>
                    <p className="text-[11px] text-gray-400">
                      {h.by} · {new Date(h.at).toLocaleDateString('pt-BR')} às {new Date(h.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Sec>
        )}

        <div className="flex gap-3 mt-2 mb-4">
          <button type="button" onClick={onEdit}
            className="flex-1 py-4 rounded-2xl bg-[#1B3A6B] text-white font-bold text-sm flex items-center justify-center gap-2 active:opacity-80">
            <Pencil size={18} /> Editar
          </button>
          <button type="button" onClick={() => setShowShare(true)}
            className="flex-1 py-4 rounded-2xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:opacity-80">
            <Share2 size={18} /> Compartilhar
          </button>
          <button type="button" onClick={onPrint}
            className="flex-1 py-4 rounded-2xl border-2 border-[#1B3A6B] text-[#1B3A6B] font-bold text-sm flex items-center justify-center gap-2 active:bg-blue-50">
            <Printer size={18} /> Imprimir
          </button>
        </div>
        {showShare && <ShareModal ro={ro} onClose={() => setShowShare(false)} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PRINT SCREEN
// ─────────────────────────────────────────────
