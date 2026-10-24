import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { WizardStep, OccurrenceReport } from '../types';
import { AGENTS, STEP_LABELS } from '../constants';
import { cn } from '../report-model';
import { StepCabecalho, StepSolicitante, StepOcorrencia, StepDetalhes, StepApoio, StepFotos, StepConcluir } from './Steps';


export interface ValidationError { message: string; step: WizardStep; }

export function validateRO(ro: OccurrenceReport): ValidationError | null {
  if (!ro.agent)             return { message: 'Informe quem está preenchendo o R.O.', step: 1 };
  if (!ro.address)           return { message: 'Informe o endereço da ocorrência.', step: 2 };
  if (!ro.neighborhood)      return { message: 'Informe o bairro da ocorrência.',   step: 2 };
  if (!ro.occurrenceTypeId)  return { message: 'Selecione o tipo de ocorrência.',   step: 3 };
  return null;
}

export function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <p className="text-[10px] font-black text-[#1B3A6B] uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
export function ReviewRow({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      {label && <span className="text-[11px] text-gray-500 min-w-[90px] flex-shrink-0">{label}</span>}
      <span className={cn('text-xs font-semibold flex-1', highlight ? 'text-orange-600' : 'text-gray-800')}>{value}</span>
    </div>
  );
}

export function WizardScreen({ ro, onUpdate, onSave, onCancel }: {
  ro: OccurrenceReport;
  onUpdate: (u: Partial<OccurrenceReport>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [showReview, setShowReview] = useState(false);
  const TOTAL = 7;

  const goNext = () => {
    if (step < TOTAL) { setStep((step + 1) as WizardStep); window.scrollTo(0, 0); return; }
    const err = validateRO(ro);
    if (err) { setValidationError(err); return; }
    setShowReview(true);
  };
  const goBack = () => {
    if (step > 1) { setStep((step - 1) as WizardStep); window.scrollTo(0, 0); }
    else setConfirmLeave(true);
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }} className="min-h-screen flex flex-col transition-colors">
      {/* Header */}
      <div className="bg-[#1B3A6B] text-white sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={goBack} className="p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-blue-300 font-medium">R.O. {ro.roNumber}</p>
            <p className="font-bold text-sm truncate">{STEP_LABELS[step - 1]}</p>
          </div>
          <span className="text-xs text-blue-300 flex-shrink-0">{step}/{TOTAL}</span>
        </div>
        <div className="h-1 bg-[#0d2147]">
          <div className="h-full bg-orange-400 transition-all duration-300"
            style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-28">
        {step === 1 && <StepCabecalho   ro={ro} onChange={onUpdate} />}
        {step === 2 && <StepSolicitante ro={ro} onChange={onUpdate} />}
        {step === 3 && <StepOcorrencia  ro={ro} onChange={onUpdate} />}
        {step === 4 && <StepDetalhes    ro={ro} onChange={onUpdate} />}
        {step === 5 && <StepApoio       ro={ro} onChange={onUpdate} />}
        {step === 6 && <StepFotos       ro={ro} onChange={onUpdate} />}
        {step === 7 && <StepConcluir    ro={ro} onChange={onUpdate} />}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 safe-area-pb">
        <button type="button" onClick={goBack}
          className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm active:bg-gray-50">
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </button>
        <button type="button" onClick={goNext}
          className="flex-[2] py-3.5 rounded-xl bg-[#1B3A6B] text-white font-bold text-sm flex items-center justify-center gap-2 active:bg-[#142d52] shadow-sm">
          {step === TOTAL
            ? <><Check size={18} strokeWidth={3} /> Salvar R.O.</>
            : <>Continuar <ChevronRight size={18} /></>}
        </button>
      </div>

      {/* Modal — revisão antes de salvar */}
      {showReview && (
        <div className="fixed inset-0 bg-black/70 flex flex-col z-50 overflow-y-auto">
          <div className="bg-white rounded-t-3xl mt-auto min-h-[85vh] flex flex-col">
            <div className="sticky top-0 bg-white rounded-t-3xl px-5 pt-5 pb-3 border-b border-gray-100 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-[#1B3A6B] text-base">Revisão do R.O.</p>
                  <p className="text-xs text-gray-500 mt-0.5">Confirme os dados antes de salvar</p>
                </div>
                <button type="button" onClick={() => setShowReview(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Identificação */}
              <ReviewSection title="Identificação">
                <ReviewRow label="Nº R.O." value={ro.roNumber} />
                <ReviewRow label="Data" value={ro.date} />
                <ReviewRow label="Hora inicial" value={ro.startTime} />
                <ReviewRow label="Viatura" value={ro.vehicle} />
                <ReviewRow label="Preenchido por" value={AGENTS.find(a => a.name === ro.agent)?.display ?? ro.agent} />
                {ro.role && <ReviewRow label="Cargo" value={ro.role} />}
              </ReviewSection>

              {/* Endereço */}
              <ReviewSection title="Endereço">
                <ReviewRow label="Logradouro" value={[ro.address, ro.addressNumber].filter(Boolean).join(', ')} />
                <ReviewRow label="Bairro" value={ro.neighborhood} />
              </ReviewSection>

              {/* Ocorrência */}
              <ReviewSection title="Ocorrência">
                <ReviewRow label="Tipo" value={ro.occurrenceTypeLabel} />
                {ro.emergency && <ReviewRow label="Emergência" value="Sim" highlight />}
              </ReviewSection>

              {/* Solicitante */}
              {(ro.reporterName || ro.phone) && (
                <ReviewSection title="Solicitante">
                  <ReviewRow label="Nome" value={ro.reporterName} />
                  <ReviewRow label="Telefone" value={ro.phone} />
                </ReviewSection>
              )}

              {/* Equipe */}
              {(ro.agentParticipants ?? []).length > 0 && (
                <ReviewSection title="Agentes Participantes">
                  {(ro.agentParticipants ?? []).map(n => (
                    <ReviewRow key={n} label="" value={AGENTS.find(a => a.name === n)?.display ?? n} />
                  ))}
                </ReviewSection>
              )}

              {/* Fotos */}
              {ro.photos.length > 0 && (
                <ReviewSection title="Fotos">
                  <ReviewRow label="Total de fotos" value={`${ro.photos.length} foto(s)`} />
                </ReviewSection>
              )}

              {/* Desfecho */}
              {ro.conclusionStatus && (
                <ReviewSection title="Desfecho">
                  <ReviewRow label="Status" value={{ encaminhar: 'Encaminhar', arquivar: 'Arquivar / Finalizado', monitoramento: 'Monitoramento', '': '' }[ro.conclusionStatus] ?? ''} />
                  {ro.conclusion && <ReviewRow label="Conclusão" value={ro.conclusion} />}
                </ReviewSection>
              )}

              {/* Auto de Interdição */}
              {ro.interdicao?.active && (
                <ReviewSection title="Auto de Interdição">
                  <ReviewRow label="Nº do Auto" value={ro.interdicao.numero} highlight />
                  <ReviewRow label="Tipo" value={ro.interdicao.tipo === 'parcial' ? 'Parcial' : 'Total'} />
                  {ro.interdicao.causas.length > 0 && <ReviewRow label="Causas" value={ro.interdicao.causas.join(', ')} />}
                </ReviewSection>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <button type="button" onClick={() => { setShowReview(false); onSave(); }}
                className="w-full py-4 rounded-2xl bg-green-600 text-white font-black text-sm flex items-center justify-center gap-2 active:opacity-80 shadow-lg">
                <Check size={20} strokeWidth={3} /> Confirmar e Salvar R.O.
              </button>
              <button type="button" onClick={() => setShowReview(false)}
                className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm">
                Voltar e corrigir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — erro de validação */}
      {validationError && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <p className="font-bold text-gray-800 text-base">Campo obrigatório</p>
            </div>
            <p className="text-sm text-gray-500 mb-5">{validationError.message}</p>
            <button type="button"
              onClick={() => { setStep(validationError.step); setValidationError(null); window.scrollTo(0, 0); }}
              className="w-full py-3 rounded-xl bg-[#1B3A6B] text-white font-bold text-sm">
              Ir para a etapa {validationError.step}
            </button>
          </div>
        </div>
      )}

      {/* Modal — confirmação de saída */}
      {confirmLeave && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="font-bold text-gray-800 text-base mb-2">Sair do preenchimento?</p>
            <p className="text-sm text-gray-500 mb-5">O rascunho será salvo e você poderá continuar depois.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmLeave(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm">
                Continuar aqui
              </button>
              <button type="button" onClick={() => { setConfirmLeave(false); onCancel(); }}
                className="flex-1 py-3 rounded-xl bg-[#1B3A6B] text-white font-bold text-sm">
                Salvar rascunho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────
