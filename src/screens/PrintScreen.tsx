import { ChevronLeft, Printer } from 'lucide-react';
import { OccurrenceReport } from '../types';
import { OCCURRENCE_TYPES, ORIGINS } from '../constants';
import { getDefaultInterdicao, cn, fmtDate } from '../report-model';
import { Checkbox } from '../components/ui';

export function PrintScreen({ ro, onClose }: { ro: OccurrenceReport; onClose: () => void }) {
  const type = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);
  const selectedAgencies = ro.agencies.filter(a => a.selected);
  const hasLosses = Object.entries(ro.losses)
    .some(([k, v]) => ['furniture','food','clothes','documents','property','others'].includes(k) && v === true);

  // Checkbox indicator for print
  const CB = ({ v, className: cls }: { v: boolean; className?: string }) => (
    <span className={cn('inline-flex items-center justify-center w-3.5 h-3.5 border border-gray-600 text-[9px] leading-none mr-1', cls)}>
      {v ? '✓' : ''}
    </span>
  );

  const TCell = ({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) => (
    <td colSpan={colSpan} className={cn('border border-gray-500 px-1.5 py-1 align-top text-[10px]', className)}>{children}</td>
  );

  const TLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={`font-bold text-[9px] uppercase block leading-tight text-gray-600${className ? ' ' + className : ''}`}>{children}</span>
  );

  const TValue = ({ children, className: cls }: { children: React.ReactNode; className?: string }) => (
    <span className={cn('text-[11px] block min-h-[14px]', cls)}>{children}</span>
  );

  const renderDynamic = () => {
    const f = ro.dynamicFields;
    if (!type || type.section === 'generic') return null;

    if (type.section === 'trees') return (
      <tr><TCell colSpan={3}>
        <TLabel>Remoção de Árvores</TLabel>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px]">
          <span><CB v={f.hasRisk === true} /> Há risco — autorizar corte/poda
            <CB v={f.hasRisk === false} /> Não — orientar munícipe</span>
          <span><CB v={f.fallen === 'sim'} /> Já tombada
            {f.fallen === 'sim' && ` (${String(f.fallenCount ?? '—')})`}
            <CB v={f.fallen === 'nao'} className="ml-2" /> Não tombada</span>
          {!!f.hasRisk && <><span><CB v={!!f.detSupressao} /> Det. de Supressão</span>
            <span><CB v={!!f.supressao} /> Supressão realizada</span></>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'structural') return (
      <tr><TCell colSpan={3}>
        <TLabel>Obras Civis — Patologias</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={!!f.fissuras} /> Fissuras</span>
          <span><CB v={!!f.rachaduras} /> Rachaduras</span>
          <span><CB v={!!f.recalque} /> Recalque</span>
          <span><CB v={!!f.hidraulica} /> Hidráulica</span>
          {!!f.outrosPatologias && <span>Outros: {String(f.outrosPatologias)}</span>}
          <span className="ml-2"><CB v={f.hasRisk === true} /> Há risco
            <CB v={f.hasRisk === false} className="ml-2" /> Sem risco</span>
          {!!f.riskExtent && <span>Extensão: {String(f.riskExtent)}</span>}
          {!!f.barragemRompimento && <span>Causa: Rompimento de Barragem</span>}
          {!!f.sistemaDrenagem && <span>Causa: Sistema de Drenagem</span>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'bees') return (
      <tr><TCell colSpan={3}>
        <TLabel>Remoção de Abelhas / Vespas</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={f.needsRemoval === true} /> Atacando</span>
          <span><CB v={f.needsRemoval === false} /> Em formação</span>
          <span className="ml-2">Espécie:</span>
          {['europa','jataí','marimbondo','vespa'].map(s => (
            <span key={s}><CB v={!!f[s]} /> {s.charAt(0).toUpperCase()+s.slice(1)}</span>
          ))}
        </div>
      </TCell></tr>
    );

    if (type.section === 'animals') return (
      <tr><TCell colSpan={3}>
        <TLabel>Captura de Animais</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={!!f.reptil} /> Réptil</span>
          <span><CB v={!!f.peconhento} /> Peçonhento</span>
          <span><CB v={!!f.naoPecon} /> Não Peçonhento</span>
          {!!f.outros && <span>Outros: {String(f.outros)}</span>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'geological') return (
      <tr><TCell colSpan={3}>
        <TLabel>Geológico — Deslizamento</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={f.type === 'ameaca'} /> Ameaça</span>
          <span><CB v={f.type === 'ocorrido'} /> Já ocorrido</span>
          {!!f.fichaAvaliacao && <span>Ficha Avaliação nº {String(f.fichaAvaliacao)}</span>}
          {!!f.autoInterdicao && <span>Auto de Interdição nº {String(f.autoInterdicao)}</span>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'hydrological') return (
      <tr><TCell colSpan={3}>
        <TLabel>Hidrológico</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          <span><CB v={!!f.chuva} /> Chuva</span>
          <span><CB v={!!f.assoreamento} /> Assoreamento</span>
          {!!f.outro && <span>Outro: {String(f.outro)}</span>}
        </div>
      </TCell></tr>
    );

    if (type.section === 'fire') return (
      <tr><TCell colSpan={3}>
        <TLabel>Incêndio</TLabel>
        <div className="flex flex-wrap gap-x-3 mt-1 text-[10px]">
          {['urbano','florestal','industrial','residencial'].map(t => (
            <span key={t}><CB v={f.type === t} /> {t.charAt(0).toUpperCase()+t.slice(1)}</span>
          ))}
          {!!f.outros && <span>Outros: {String(f.outros)}</span>}
        </div>
      </TCell></tr>
    );

    return null;
  };

  return (
    <div className="bg-gray-100 min-h-screen print:bg-white">
      {/* Controls */}
      <div className="no-print sticky top-0 z-50 bg-[#1B3A6B] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <button type="button" onClick={onClose} className="p-1 -ml-1">
          <ChevronLeft size={24} />
        </button>
        <span className="flex-1 font-bold text-sm">R.O. {ro.roNumber} — Pré-visualização</span>
        <button type="button" onClick={() => window.print()}
          className="bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow active:bg-orange-600">
          <Printer size={16} /> Imprimir / PDF
        </button>
      </div>

      {/* ── DOCUMENTO 1: RELATÓRIO DE OCORRÊNCIA ── */}
      <div className="bg-white mx-auto my-4 shadow-md print:shadow-none print:my-0
                      max-w-[210mm] print:max-w-none text-[11px] font-sans leading-tight">
        <table className="w-full border-collapse border-2 border-gray-700 text-[10px]">
          {/* ─ Cabeçalho ─ */}
          <tbody>
            <tr>
              <TCell className="w-20 text-center border-r-2 border-gray-700 py-2">
                <img src="/brasao-cajamar.gif" alt="Brasão Cajamar" className="w-16 h-16 mx-auto object-contain" />
              </TCell>
              <TCell className="text-center border-r-2 border-gray-700 py-1">
                <div className="text-[9px] text-gray-600 leading-tight">Prefeitura do Município de Cajamar</div>
                <div className="text-[9px] text-gray-600 leading-tight">ESTADO DE SÃO PAULO</div>
                <div className="text-[9px] text-gray-600 leading-tight mb-1">Coordenadoria de Proteção e Defesa Civil</div>
                <div className="font-black text-sm text-gray-800 tracking-wide">RELATÓRIO DE OCORRÊNCIA</div>
              </TCell>
              <TCell className="w-24 text-center py-2">
                <img src="/logo-dc-cajamar.jpg" alt="Defesa Civil Cajamar" className="w-16 h-16 mx-auto object-contain" />
              </TCell>
            </tr>

            <tr className="border-t border-gray-500">
              <TCell><TLabel>Número</TLabel><TValue>{ro.roNumber}</TValue></TCell>
              <TCell><TLabel>Data</TLabel><TValue>{fmtDate(ro.date)}</TValue></TCell>
              <TCell>
                <TLabel>Emergência</TLabel>
                <div className="text-[10px] mt-0.5 flex gap-3">
                  <span><CB v={ro.emergency === true} /> Sim</span>
                  <span><CB v={ro.emergency === false} /> Não</span>
                </div>
              </TCell>
            </tr>

            {/* ─ Dados da Ocorrência ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">DADOS DA OCORRÊNCIA *</span></TCell>
            </tr>

            <tr>
              <TCell colSpan={2}>
                <TLabel>Nome</TLabel><TValue>{ro.reporterName}</TValue>
              </TCell>
              <TCell>
                <TLabel>RG/CPF</TLabel><TValue>{ro.rgCpf}</TValue>
              </TCell>
            </tr>

            <tr>
              <TCell colSpan={2}>
                <TLabel>Endereço</TLabel>
                <TValue>{[ro.address, ro.addressNumber].filter(Boolean).join(', ')}</TValue>
              </TCell>
              <TCell>
                <TLabel>Telefone</TLabel><TValue>{ro.phone}</TValue>
              </TCell>
            </tr>

            <tr>
              <TCell>
                <TLabel>Bairro</TLabel><TValue>{ro.neighborhood}</TValue>
              </TCell>
              <TCell>
                <TLabel>Tipo de Ocorrência</TLabel>
                <TValue>{ro.occurrenceTypeLabel}</TValue>
              </TCell>
              <TCell>
                <TLabel>Área de Risco</TLabel>
                <TValue>{ro.riskArea}</TValue>
              </TCell>
            </tr>
            {ro.cobrade?.active && ro.cobrade.code && (
              <tr className="border-t border-gray-400">
                <TCell colSpan={3} className="bg-orange-50">
                  <TLabel>COBRADE — Classificação de Desastre</TLabel>
                  <TValue className="font-mono font-bold">{ro.cobrade.code}</TValue>
                  <TValue>{ro.cobrade.label}</TValue>
                </TCell>
              </tr>
            )}

            <tr>
              <TCell>
                <TLabel>Viatura</TLabel><TValue>{ro.vehicle}</TValue>
              </TCell>
              <TCell>
                <TLabel>Hora Inicial</TLabel><TValue>{ro.startTime}</TValue>
              </TCell>
              <TCell>
                <TLabel>Hora Final</TLabel><TValue>{ro.endTime}</TValue>
              </TCell>
            </tr>

            <tr>
              <TCell colSpan={3}>
                <TLabel>Origem da Solicitação</TLabel>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[10px]">
                  {ORIGINS.map(o => (
                    <span key={o.id}><CB v={ro.origin === o.id} />
                      {o.label}{o.hasText && ro.origin === o.id && ro.originText ? ` ${ro.originText}` : ''}
                    </span>
                  ))}
                </div>
              </TCell>
            </tr>

            {/* ─ Agente ─ */}
            <tr>
              <TCell colSpan={2}>
                <TLabel>Agente Encarregado</TLabel>
                <TValue>{ro.agent}</TValue>
                {ro.role && <TValue className="text-gray-500 text-[9px]">{ro.role}</TValue>}
              </TCell>
              <TCell>
                <TLabel>Preenchido por / Cargo</TLabel>
                <TValue>{[ro.filledBy, ro.role].filter(Boolean).join(' / ')}</TValue>
              </TCell>
            </tr>

            {/* ─ Seção dinâmica ─ */}
            {renderDynamic()}

            {/* ─ Apoio ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">APOIO E/OU ACIONAMENTO NA OCORRÊNCIA</span></TCell>
            </tr>
            <tr>
              <TCell colSpan={3}>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {ro.agencies.map(ag => (
                    <span key={ag.id} className="text-[10px]">
                      <CB v={ag.selected} />{ag.label}
                      {ag.selected && ag.vehicles && ` — ${ag.vehicles}`}
                      {ag.selected && ag.responsible && ` (${ag.responsible})`}
                    </span>
                  ))}
                </div>
              </TCell>
            </tr>

            {/* ─ Perdas e Danos ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">PERDAS E DANOS — MATERIAIS</span></TCell>
            </tr>
            <tr>
              <TCell colSpan={3}>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {[['furniture','Móveis'],['food','Alimentos'],['clothes','Roupas'],
                    ['documents','Documentos'],['property','Imóvel'],['others','Outros']].map(([k,l]) => (
                    <span key={k}><CB v={!!(ro.losses as unknown as Record<string,unknown>)[k]} />{l}</span>
                  ))}
                  {ro.losses.victims && <span className="ml-4">Vítimas: {ro.losses.victims}</span>}
                  {ro.losses.injured && <span>Feridos: {ro.losses.injured}</span>}
                  {ro.losses.deaths && <span>Mortos: {ro.losses.deaths}</span>}
                </div>
              </TCell>
            </tr>

            {/* ─ Observações ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">OBSERVAÇÕES</span></TCell>
            </tr>
            <tr>
              <TCell colSpan={3}>
                <div className="min-h-[60px] whitespace-pre-wrap text-[10px]">{ro.observations}</div>
              </TCell>
            </tr>

            {/* ─ Assinaturas ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">ASSINATURAS</span></TCell>
            </tr>
            <tr>
              <TCell>
                <TLabel>Declarante</TLabel>
                <TValue>{ro.declarant1}</TValue>
                {ro.declarant1Role && <TValue className="text-gray-500 text-[9px]">{ro.declarant1Role}</TValue>}
                {ro.declarant1Sig
                  ? <img src={ro.declarant1Sig} alt="assinatura" className="mt-2 h-10 object-contain" />
                  : <div className="mt-4 border-t border-gray-400 text-[9px] text-gray-500">Assinatura</div>}
              </TCell>
              <TCell colSpan={2}>
                <TLabel>Agentes Participantes</TLabel>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] mt-0.5">
                  {(ro.agentParticipants ?? []).length > 0
                    ? (ro.agentParticipants ?? []).map(n => <span key={n} className="font-medium">{n}</span>)
                    : <span className="text-gray-400">—</span>}
                </div>
              </TCell>
            </tr>

            {/* ─ Desfecho ─ */}
            <tr className="border-t border-gray-500 bg-gray-50">
              <TCell colSpan={3}>
                <span className="font-black text-[10px]">DESFECHO / CONCLUSÃO</span>
                {ro.conclusionStatus && (() => {
                  const labels: Record<string, string> = { encaminhar: 'ENCAMINHAR', arquivar: 'ARQUIVAR / FINALIZADO', pendente: 'PENDENTE', monitoramento: 'MONITORAMENTO' };
                  return <span className="ml-3 text-[9px] font-bold border border-current px-1 py-0.5 rounded">{labels[ro.conclusionStatus] ?? ''}</span>;
                })()}
                {ro.conclusionStatus === 'encaminhar' && (ro.encaminharDest ?? []).length > 0 && (
                  <div className="text-[9px] mt-1 text-gray-600">→ {(ro.encaminharDest ?? []).join(' / ')}</div>
                )}
              </TCell>
            </tr>
            <tr>
              <TCell colSpan={3}><div className="min-h-[30px] whitespace-pre-wrap text-[10px]">{ro.conclusion}</div></TCell>
            </tr>

            {/* ─ Rodapé ─ */}
            <tr className="border-t-2 border-gray-700">
              <TCell colSpan={4} className="text-center py-2">
                <div className="text-[8px] text-gray-500 leading-relaxed">
                  Av. Tenente Marques, 3861 – CEP 06579-001 – Portais (Polvilho) – Cajamar/SP – Tel. (11) 4446-0199
                  &nbsp;|&nbsp; E-mail: defesacivil@cajamar.sp.gov.br
                </div>
              </TCell>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── DOCUMENTO 2: REGISTRO FOTOGRÁFICO ── */}
      {ro.photos.length > 0 && (
        <div className="bg-white mx-auto my-4 shadow-md print:shadow-none print:my-0 print-page-break
                        max-w-[210mm] print:max-w-none text-[11px] font-sans leading-tight">
          <table className="w-full border-collapse border-2 border-gray-700 text-[10px]">
            <tbody>
              {/* Header com Brasão e Logo */}
              <tr>
                <td colSpan={2} className="border border-gray-500 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <img src="/brasao-cajamar.gif" alt="Brasão Cajamar" className="w-14 h-14 object-contain" />
                    <div className="text-center flex-1 mx-2">
                      <div className="text-[9px] text-gray-600 leading-tight">Prefeitura do Município de Cajamar</div>
                      <div className="text-[9px] text-gray-600 leading-tight">ESTADO DE SÃO PAULO</div>
                      <div className="text-[9px] text-gray-600 leading-tight mb-0.5">Coordenadoria de Proteção e Defesa Civil</div>
                      <div className="font-black text-sm text-gray-800 tracking-wide">REGISTRO FOTOGRÁFICO</div>
                    </div>
                    <img src="/logo-dc-cajamar.jpg" alt="Defesa Civil Cajamar" className="w-14 h-14 object-contain" />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-500 px-2 py-1 text-[10px]">
                  <strong>R.O. nº</strong> {ro.roNumber} &nbsp;|&nbsp;
                  <strong>Data:</strong> {fmtDate(ro.date)} &nbsp;|&nbsp;
                  <strong>Hora:</strong> {ro.startTime}
                </td>
                <td className="border border-gray-500 px-2 py-1 text-[10px]">
                  <strong>Viatura:</strong> {ro.vehicle} &nbsp;|&nbsp;
                  <strong>Equipe:</strong> {(() => {
                    const encarregado = ro.agent ? `${ro.agent}${ro.re ? ` (RE: ${ro.re})` : ''}` : '';
                    const participantes = (ro.agentParticipants ?? []).filter(p => p && p !== ro.agent);
                    return [encarregado, ...participantes].filter(Boolean).join(', ') || '—';
                  })()}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-gray-500 px-2 py-1 text-[10px]">
                  <strong>Local:</strong> {[ro.address, ro.addressNumber, ro.neighborhood].filter(Boolean).join(', ')}
                  &nbsp;&nbsp;<strong>Tipo:</strong> {ro.occurrenceTypeLabel}
                </td>
              </tr>

              {/* Cenário encontrado */}
              <tr>
                <td colSpan={2} className="border border-gray-500 px-2 py-1 bg-gray-50">
                  <div className="font-black text-[10px] mb-1">📋 CENÁRIO ENCONTRADO</div>
                  <div className="text-[10px] whitespace-pre-wrap min-h-[50px]">{ro.photoScenario}</div>
                </td>
              </tr>

              {/* Photos grid — 2 per row */}
              {Array.from({ length: Math.ceil(ro.photos.length / 2) }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {[0, 1].map(col => {
                    const photo = ro.photos[rowIdx * 2 + col];
                    return (
                      <td key={col} className="border border-gray-500 px-2 py-2 w-1/2 align-top">
                        {photo ? (
                          <>
                            <img src={photo.dataUrl} alt={photo.caption}
                              className="w-full object-cover"
                              style={{ maxHeight: '160px' }} />
                            <div className="text-center text-[9px] mt-1 font-medium text-gray-700">
                              {photo.caption}
                              {photo.lat != null && (
                                <span className="block text-gray-400">GPS: {photo.lat.toFixed(5)}, {photo.lng!.toFixed(5)}</span>
                              )}
                            </div>
                          </>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ─ Rodapé ─ */}
              <tr className="border-t-2 border-gray-700">
                <td colSpan={2} className="border border-gray-500 text-center py-2">
                  <div className="text-[8px] text-gray-500 leading-relaxed">
                    Av. Tenente Marques, 3861 – CEP 06579-001 – Portais (Polvilho) – Cajamar/SP – Tel. (11) 4446-0199
                    &nbsp;|&nbsp; E-mail: defesacivil@cajamar.sp.gov.br
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── DOCUMENTO 3: AUTO DE INTERDIÇÃO ── */}
      {ro.interdicao?.active && (() => {
        const interdicao = {
          ...getDefaultInterdicao(ro.roNumber),
          ...(ro.interdicao || {}),
          numero: ro.interdicao?.numero || ro.roNumber || '',
          causas: Array.isArray(ro.interdicao?.causas) ? ro.interdicao.causas : [],
          danos: Array.isArray(ro.interdicao?.danos) ? ro.interdicao.danos : [],
          bensAfetados: Array.isArray(ro.interdicao?.bensAfetados) ? ro.interdicao.bensAfetados : [],
        };

        return (
          <div className="bg-white mx-auto my-4 shadow-md print:shadow-none print:my-0 print-page-break
                          max-w-[210mm] print:max-w-none text-[11px] font-sans leading-tight">
            <table className="w-full border-collapse border-2 border-gray-700 text-[10px]">
              <tbody>
                {/* Cabeçalho institucional com Brasão e Logo */}
                <tr>
                  <TCell className="w-20 text-center border-r-2 border-gray-700 py-2">
                    <img src="/brasao-cajamar.gif" alt="Brasão Cajamar" className="w-16 h-16 mx-auto object-contain" />
                  </TCell>
                  <TCell colSpan={2} className="text-center border-r-2 border-gray-700 py-1">
                    <div className="text-[9px] text-gray-600 leading-tight">Prefeitura do Município de Cajamar</div>
                    <div className="text-[9px] text-gray-600 leading-tight">ESTADO DE SÃO PAULO</div>
                    <div className="text-[9px] text-gray-600 leading-tight mb-1">Coordenadoria de Proteção e Defesa Civil</div>
                    <div className="font-black text-sm text-gray-800 tracking-wide">AUTO DE INTERDIÇÃO</div>
                  </TCell>
                  <TCell className="w-24 text-center py-2">
                    <img src="/logo-dc-cajamar.jpg" alt="Defesa Civil Cajamar" className="w-16 h-16 mx-auto object-contain" />
                  </TCell>
                </tr>

                {/* Identificação */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">IDENTIFICAÇÃO</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <TLabel>Nº do Auto de Interdição</TLabel>
                    <TValue>{interdicao.numero || ro.roNumber || '___________'}</TValue>
                  </TCell>
                  <TCell>
                    <TLabel>Ficha de Avaliação</TLabel>
                    <TValue>{interdicao.fichaAvaliacao || '___________'}</TValue>
                  </TCell>
                  <TCell>
                    <TLabel>Nº R.O. Vinculado</TLabel>
                    <TValue>{ro.roNumber}</TValue>
                  </TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <TLabel>Endereço da Interdição</TLabel>
                    <TValue>{[ro.address, ro.addressNumber, ro.neighborhood].filter(Boolean).join(', ')}</TValue>
                  </TCell>
                  <TCell colSpan={2}>
                    <TLabel>Data</TLabel>
                    <TValue>{ro.date}</TValue>
                  </TCell>
                </tr>

                {/* 1 — Causa */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">1 — CAUSA DA INTERDIÇÃO</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={4}>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]">
                      {['Inundação','Enchente','Incêndio','Má Construção','Explosão','Desgaste Natural','Deslizamento de Terra','Desbarrancamento','Desabamento','Obras de Terceiros'].map(c => (
                        <span key={c}><CB v={interdicao.causas.includes(c)} />{c}</span>
                      ))}
                      {interdicao.causaOutros && <span><CB v={true} />Outros: {interdicao.causaOutros}</span>}
                    </div>
                  </TCell>
                </tr>

                {/* 2 — Danos */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">2 — DANOS APARENTES</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={4}>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]">
                      {['Teto','Parede','Pisos','Estrutura','Fundações'].map(d => (
                        <span key={d}><CB v={interdicao.danos.includes(d)} />{d}</span>
                      ))}
                      {interdicao.danosOutros && <span><CB v={true} />Outros: {interdicao.danosOutros}</span>}
                    </div>
                  </TCell>
                </tr>

                {/* 3 — Bens */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">3 — BENS AFETADOS</span></TCell>
                </tr>
                <tr>
                  <TCell>
                    <span className="text-[10px]"><CB v={interdicao.bensAfetados.includes('particular')} />Particular</span>
                    {interdicao.bensAfetados.includes('particular') && interdicao.valorParticular && (
                      <div className="text-[9px] text-gray-600 ml-4">Valor: {interdicao.valorParticular.trim().startsWith('R$') ? interdicao.valorParticular : `R$ ${interdicao.valorParticular}`}</div>
                    )}
                  </TCell>
                  <TCell>
                    <span className="text-[10px]"><CB v={interdicao.bensAfetados.includes('municipal')} />Municipal</span>
                    {interdicao.bensAfetados.includes('municipal') && interdicao.valorMunicipal && (
                      <div className="text-[9px] text-gray-600 ml-4">Valor: {interdicao.valorMunicipal.trim().startsWith('R$') ? interdicao.valorMunicipal : `R$ ${interdicao.valorMunicipal}`}</div>
                    )}
                  </TCell>
                  <TCell colSpan={2}>
                    <span className="text-[10px]"><CB v={interdicao.bensAfetados.includes('estadual')} />Estadual</span>
                    {interdicao.bensAfetados.includes('estadual') && interdicao.valorEstadual && (
                      <div className="text-[9px] text-gray-600 ml-4">Valor: {interdicao.valorEstadual.trim().startsWith('R$') ? interdicao.valorEstadual : `R$ ${interdicao.valorEstadual}`}</div>
                    )}
                  </TCell>
                </tr>

                {/* 4 — Tipo */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">4 — TIPO DE INTERDIÇÃO</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <div className="flex gap-4 text-[10px]">
                      <span><CB v={interdicao.tipo === 'parcial'} />Parcial</span>
                      <span><CB v={interdicao.tipo === 'total'} />Total</span>
                    </div>
                  </TCell>
                  <TCell colSpan={2}>
                    <TLabel>Evacuará o imóvel?</TLabel>
                    <div className="flex gap-4 text-[10px] mt-0.5">
                      <span><CB v={interdicao.evacuarImovel === 'sim'} />Sim</span>
                      <span><CB v={interdicao.evacuarImovel === 'nao'} />Não</span>
                    </div>
                    {interdicao.evacuarImovel === 'sim' && (
                      <div className="text-[9px] mt-1 text-gray-700">
                        Prazo: <strong>{interdicao.prazoAbandono || 'Imediatamente'}</strong>
                      </div>
                    )}
                  </TCell>
                </tr>

                {/* 5 — Destino */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">5 — DESTINO DO MORADOR</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <div className="flex gap-4 text-[10px]">
                      <span><CB v={interdicao.destinoMorador === 'parentes'} />Parentes / Vizinhos</span>
                      <span><CB v={interdicao.destinoMorador === 'outros'} />Outros{interdicao.destinoOutros ? `: ${interdicao.destinoOutros}` : ''}</span>
                    </div>
                  </TCell>
                  <TCell>
                    <TLabel>Contato</TLabel>
                    <TValue>{interdicao.destinoContato}</TValue>
                  </TCell>
                  <TCell>
                    <TLabel>Telefone</TLabel>
                    <TValue>{interdicao.destinoTelefone}</TValue>
                  </TCell>
                </tr>
                {interdicao.destinoEndereco && (
                  <tr>
                    <TCell colSpan={4}>
                      <TLabel>Endereço de destino</TLabel>
                      <TValue>{interdicao.destinoEndereco}</TValue>
                    </TCell>
                  </tr>
                )}

                {/* 6 — Observações */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">6 — OBSERVAÇÕES IMPORTANTES</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={4}>
                    <div className="min-h-[40px] whitespace-pre-wrap text-[10px]">{interdicao.observacoes}</div>
                  </TCell>
                </tr>

                {/* 7 — Assinatura responsável pela moradia */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">7 — ASSINATURA DO RESPONSÁVEL PELA MORADIA / TESTEMUNHA</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <div className="flex gap-4 text-[10px] mb-1">
                      {[['proprietario','Proprietário'],['morador','Morador'],['locatario','Locatário'],['testemunha','Testemunha']].map(([id, label]) => (
                        <span key={id}><CB v={interdicao.responsavelTipo === id} />{label}</span>
                      ))}
                    </div>
                    <TLabel>Nome</TLabel><TValue>{interdicao.responsavelNome}</TValue>
                    <TLabel className="mt-1">RG</TLabel><TValue>{interdicao.responsavelRG}</TValue>
                    <TLabel className="mt-1">Telefone</TLabel><TValue>{interdicao.responsavelTelefone}</TValue>
                  </TCell>
                  <TCell colSpan={2}>
                    <TLabel>Assinatura — ciente dos termos do presente Auto</TLabel>
                    {interdicao.responsavelAssinatura
                      ? <img src={interdicao.responsavelAssinatura} alt="assinatura" className="mt-2 h-12 object-contain" />
                      : <div className="mt-8 border-t border-gray-400 text-[9px] text-gray-500">Assinatura</div>}
                    <div className="mt-1 text-[9px] text-gray-500">
                      Cajamar, {ro.date ? new Date(ro.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '___/___/______'}
                    </div>
                  </TCell>
                </tr>

                {/* 8 — Assinatura do agente */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">8 — ASSINATURA DO RESPONSÁVEL PELA INTERDIÇÃO</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={2}>
                    <TLabel>Nome</TLabel><TValue>{ro.agent}</TValue>
                    <TLabel className="mt-1">Matrícula (RE)</TLabel><TValue>{ro.re}</TValue>
                    <TLabel className="mt-1">Cargo</TLabel><TValue>{ro.role}</TValue>
                  </TCell>
                  <TCell colSpan={2}>
                    <div className="mt-8 border-t border-gray-400 text-[9px] text-gray-500">Assinatura do Responsável da Defesa Civil</div>
                    <div className="mt-1 text-[9px] text-gray-500">
                      Cajamar, {ro.date ? new Date(ro.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '___/___/______'}
                    </div>
                  </TCell>
                </tr>

                {/* 9 — Notas */}
                <tr className="border-t-2 border-gray-700 bg-gray-50">
                  <TCell colSpan={4}><span className="font-black text-[10px]">9 — NOTAS</span></TCell>
                </tr>
                <tr>
                  <TCell colSpan={4}>
                    <div className="space-y-1 text-[8px] leading-tight text-gray-700 p-1">
                      <p>
                        <strong>1 —</strong> O presente Auto de Interdição é lavrado com base na Lei Federal 12.608/12, Art. 8, Incisos: &ldquo;IV - identificar e mapear, as áreas de risco de desastres; VII - vistoriar edificações e áreas de risco e promover, quando for o caso, a intervenção preventiva e a evacuação da população das áreas de alto risco ou das edificações vulneráveis;&rdquo;.
                      </p>
                      <p>
                        <strong>2 —</strong> O notificado deve evacuar/sair do local/imóvel conforme o Termo de Interdição acima no prazo recomendado.
                      </p>
                      <p>
                        <strong>3 —</strong> Não acatando o presente Auto de Interdição, o morador assume a total responsabilidade por quaisquer eventuais danos materiais ou pessoais, decorrentes de sinistro, que segundo conclusão da Vistoria, pelo local ser considerado de &ldquo;Risco Muito Alto&rdquo;.
                      </p>
                      <p>
                        <strong>4 —</strong> A desinterdição do imóvel poderá ser requerida à Coordenadoria de Proteção e Defesa Civil por meio da apresentação de &ldquo;Laudo Técnico de Segurança e Estabilidade&rdquo;, emitido por profissional habilitado, com sua respectiva ART. As custas deste documento são de responsabilidade do próprio interessado. O modelo deste documento poderá ser obtido na própria Coordenadoria.
                      </p>
                    </div>
                  </TCell>
                </tr>

                {/* Rodapé */}
                <tr className="border-t-2 border-gray-700">
                  <TCell colSpan={4} className="text-center py-2">
                    <div className="text-[8px] text-gray-500 leading-relaxed">
                      Av. Tenente Marques, 3861 – CEP 06579-001 – Portais (Polvilho) – Cajamar/SP – Tel. (11) 4446-0199
                      &nbsp;|&nbsp; E-mail: defesacivil@cajamar.sp.gov.br
                    </div>
                  </TCell>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}

      <div className="no-print h-8" />
    </div>
  );
}

// ─────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────

// Email da conta compartilhada legada — mantido para compatibilidade durante a migração.
