import { useState, useRef } from 'react';
import { Camera, Check, Trash2, X, Search, FileText } from 'lucide-react';
import { Photo, Agency, OccurrenceReport } from '../types';
import { COBRADE_LIST, OccurrenceType, OCCURRENCE_TYPES, ORIGINS, AGENTS, SECRETARIAS } from '../constants';
import { genId, formatBRLInput, getDefaultInterdicao, compressImage, cn } from '../report-model';
import { Toggle, Field, Input, Textarea, Checkbox, Card, SecTitle } from '../components/ui';
import { DF, TreesSection, StructuralSection, BeesSection, AnimalsSection, GeologicalSection, HydroSection, FireSection } from '../components/DamageSections';
import { AgentPicker, AgentMultiPicker } from '../components/AgentPickers';
import { SignaturePad } from '../components/SignaturePad';
import { opcoesDeViatura, useViaturas } from '../viaturas';

export type StepProps = { ro: OccurrenceReport; onChange: (u: Partial<OccurrenceReport>) => void };

export function StepCabecalho({ ro, onChange }: StepProps) {
  const viaturas = useViaturas();
  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Emergência?</SecTitle>
        <div className="flex gap-2">
          <Toggle label="🚨 Sim" active={ro.emergency === true}  onClick={() => onChange({ emergency: true  })} />
          <Toggle label="Não"    active={ro.emergency === false} onClick={() => onChange({ emergency: false })} />
        </div>
      </Card>

      <Card>
        <SecTitle>Identificação</SecTitle>
        <div className="space-y-3">
          <Field label="Nº do R.O.">
            <Input value={ro.roNumber} onChange={v => onChange({ roNumber: v })} placeholder="Ex: 001/2026" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" required>
              <Input type="date" value={ro.date} onChange={v => onChange({ date: v })} />
            </Field>
            <Field label="Hora inicial" required>
              <Input type="time" value={ro.startTime} onChange={v => onChange({ startTime: v })} />
            </Field>
          </div>
          <Field label="Hora final">
            <Input type="time" value={ro.endTime} onChange={v => onChange({ endTime: v })} />
          </Field>
        </div>
      </Card>

      <Card>
        <SecTitle>Veículo</SecTitle>
        <Field label="Viatura" required>
          <select value={ro.vehicle} onChange={e => onChange({ vehicle: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
            <option value="">Selecione a viatura...</option>
            {opcoesDeViatura(viaturas, ro.vehicle).map(v => <option key={v} value={v}>{v}</option>)}
            <option value="Outros">Outros</option>
          </select>
        </Field>
      </Card>

      <Card>
        <SecTitle>Preenchido Por</SecTitle>
        {ro.agentLocked ? (
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="w-9 h-9 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {(AGENTS.find(a => a.name === ro.agent)?.display ?? ro.agent).charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--text-main)]">
                {AGENTS.find(a => a.name === ro.agent)?.display ?? ro.agent}
              </p>
              {ro.role && <p className="text-xs text-[var(--text-muted)]">{ro.role}</p>}
              {ro.re && <p className="text-xs text-[var(--text-muted)]">RE: {ro.re}</p>}
            </div>
            <span className="ml-auto text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">🔒 Identificado</span>
          </div>
        ) : (
          <Field label="Responsável pelo preenchimento" required>
            <AgentPicker value={ro.agent} onChange={(name, re, role) => onChange({ agent: name, re, role })} />
          </Field>
        )}
      </Card>

      <Card>
        <SecTitle>Origem da Solicitação</SecTitle>
        {/* opções sem campo de texto: grid 2 colunas */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {ORIGINS.filter(o => !o.hasText).map(o => (
            <Toggle key={o.id} label={o.label} active={ro.origin === o.id}
              onClick={() => onChange({ origin: ro.origin === o.id ? '' : o.id, originText: '' })} />
          ))}
        </div>
        {/* opções com campo de texto: cada uma em linha própria */}
        <div className="space-y-2">
          {ORIGINS.filter(o => o.hasText).map(o => (
            <div key={o.id}>
              <Toggle label={o.label} active={ro.origin === o.id}
                onClick={() => onChange({ origin: ro.origin === o.id ? '' : o.id, originText: '' })} />
              {ro.origin === o.id && (
                <div className="mt-1.5 ml-1">
                  <Input value={ro.originText} onChange={v => onChange({ originText: v })}
                    placeholder={o.id === 'procAdm' ? 'Número do processo...' : o.id === 'oficio' ? 'Número do ofício...' : 'Especifique...'} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export interface NominatimResult {
  display_name: string;
  address: {
    road?: string; pedestrian?: string; path?: string;
    suburb?: string; neighbourhood?: string; quarter?: string;
    house_number?: string;
  };
}

export function AddressAutocomplete({ value, onChange, onSelect }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (road: string, number: string, suburb: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = (q: string) => {
    if (q.length < 4) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Cajamar, SP')}&format=json&addressdetails=1&limit=5&countrycodes=br`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 500);
  };

  const pick = (r: NominatimResult) => {
    const road = r.address.road ?? r.address.pedestrian ?? r.address.path ?? '';
    const number = r.address.house_number ?? '';
    const suburb = r.address.suburb ?? r.address.neighbourhood ?? r.address.quarter ?? '';
    onSelect(road, number, suburb);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input value={value} onChange={e => { onChange(e.target.value); fetchSuggestions(e.target.value); }}
          placeholder="Rua, Av., Estrada..."
          className="w-full px-4 py-3 rounded-xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>
        )}
      </div>
      {suggestions.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          className="absolute z-30 left-0 right-0 mt-1 border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((r, i) => (
            <button key={i} type="button" onClick={() => pick(r)}
              style={{ color: 'var(--text-main)', borderColor: 'var(--border)' }}
              className="w-full px-4 py-3 text-left text-xs border-b last:border-0 active:opacity-70 leading-tight">
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StepSolicitante({ ro, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Dados do Solicitante</SecTitle>
        <div className="space-y-3">
          <Field label="Nome" required>
            <Input value={ro.reporterName} onChange={v => onChange({ reporterName: v })} placeholder="Nome completo" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RG / CPF">
              <Input value={ro.rgCpf} onChange={v => onChange({ rgCpf: v })} placeholder="000.000.000-00" />
            </Field>
            <Field label="Telefone">
              <Input type="tel" value={ro.phone} onChange={v => onChange({ phone: v })} placeholder="(11) 90000-0000" />
            </Field>
          </div>
          <Field label="E-mail">
            <Input type="email" value={ro.reporterEmail ?? ''} onChange={v => onChange({ reporterEmail: v })} placeholder="email@exemplo.com" />
          </Field>
        </div>
      </Card>

      <Card>
        <SecTitle>Endereço da Ocorrência</SecTitle>
        <div className="space-y-3">
          <Field label="Logradouro" required>
            <AddressAutocomplete
              value={ro.address}
              onChange={v => onChange({ address: v })}
              onSelect={(road, number, suburb) => onChange({
                address: road,
                addressNumber: number || ro.addressNumber,
                neighborhood: suburb || ro.neighborhood,
              })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Nº">
              <Input value={ro.addressNumber} onChange={v => onChange({ addressNumber: v })} placeholder="Nº" />
            </Field>
            <div className="col-span-2">
              <Field label="Bairro" required>
                <Input value={ro.neighborhood} onChange={v => onChange({ neighborhood: v })} placeholder="Bairro" />
              </Field>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function CobradeSelector({ cobrade, onChange }: {
  cobrade: { active: boolean; code: string; label: string };
  onChange: (c: { active: boolean; code: string; label: string }) => void;
}) {
  const existingItem = COBRADE_LIST.find(c => c.code === cobrade.code);
  const [selGroup, setSelGroup] = useState<string>(existingItem?.group ?? '');
  const [selSub,   setSelSub]   = useState<string>(existingItem?.subgroup ?? '');

  const groups    = [...new Set(COBRADE_LIST.map(c => c.group))];
  const subgroups = selGroup ? [...new Set(COBRADE_LIST.filter(c => c.group === selGroup).map(c => c.subgroup))] : [];
  const items     = selSub   ? COBRADE_LIST.filter(c => c.subgroup === selSub) : [];

  const sel = (cls: string) =>
    `w-full rounded-xl px-3 py-2.5 text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 ${cls}`;

  return (
    <div className="mt-3 space-y-3">
      <Field label="1. Grupo">
        <select value={selGroup} onChange={e => { setSelGroup(e.target.value); setSelSub(''); onChange({ ...cobrade, code: '', label: '' }); }} className={sel('')}>
          <option value="">Selecione o grupo...</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>
      {selGroup && (
        <Field label="2. Subgrupo / Tipo">
          <select value={selSub} onChange={e => { setSelSub(e.target.value); onChange({ ...cobrade, code: '', label: '' }); }} className={sel('')}>
            <option value="">Selecione o subgrupo...</option>
            {subgroups.map(s => <option key={s} value={s}>{s.split(' – ')[1] ?? s}</option>)}
          </select>
        </Field>
      )}
      {selSub && (
        <Field label="3. Evento / Código">
          <select value={cobrade.code} onChange={e => {
            const item = COBRADE_LIST.find(c => c.code === e.target.value);
            if (item) onChange({ active: true, code: item.code, label: item.label });
          }} className={sel('')}>
            <option value="">Selecione o evento...</option>
            {items.map(i => <option key={i.code} value={i.code}>{i.label}</option>)}
          </select>
        </Field>
      )}
      {cobrade.code && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-0.5">Código COBRADE selecionado</p>
          <p className="text-sm font-bold text-orange-900 font-mono">{cobrade.code}</p>
          <p className="text-xs text-orange-700 mt-0.5">{cobrade.label}</p>
        </div>
      )}
    </div>
  );
}

export function StepOcorrencia({ ro, onChange }: StepProps) {
  const [search, setSearch] = useState('');

  const filtered = OCCURRENCE_TYPES.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );
  const categories = [...new Set(filtered.map(t => t.category))];

  const selectType = (t: OccurrenceType) => {
    onChange({ occurrenceTypeId: t.id, occurrenceTypeLabel: t.label, dynamicFields: {} });
    setSearch('');
  };

  const selectedType = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);

  return (
    <div className="space-y-4">
      {/* COBRADE — topo */}
      <Card>
        <SecTitle>COBRADE</SecTitle>
        <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
          Classificação e Codificação Brasileira de Desastres. Preencha somente se a ocorrência se enquadrar como desastre.
        </p>
        <Field label="Esta ocorrência é um desastre (COBRADE)?">
          <div className="flex gap-3 mt-1">
            {['Sim', 'Não'].map(opt => {
              const isActive = opt === 'Sim' ? !!ro.cobrade?.active : ro.cobrade?.active === false;
              return (
                <button key={opt} type="button"
                  onClick={() => onChange({ cobrade: { active: opt === 'Sim', code: '', label: '' } })}
                  className={cn('flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors',
                    isActive ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 text-gray-600 bg-white')}>
                  {opt}
                </button>
              );
            })}
          </div>
        </Field>
        {ro.cobrade?.active && (
          <CobradeSelector cobrade={ro.cobrade} onChange={c => onChange({ cobrade: c })} />
        )}
      </Card>

      {/* Tipo de Ocorrência */}
      <Card>
        <SecTitle>Tipo de Ocorrência</SecTitle>

        {ro.occurrenceTypeId ? (
          <div className="flex items-center gap-3 p-3 bg-[#1B3A6B] rounded-xl">
            <span className="text-2xl">{selectedType?.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{ro.occurrenceTypeLabel}</p>
              <p className="text-blue-300 text-xs">{selectedType?.category}</p>
            </div>
            <button type="button"
              onClick={() => onChange({ occurrenceTypeId: '', occurrenceTypeLabel: '', dynamicFields: {} })}
              className="text-blue-300 hover:text-white p-1 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tipo de ocorrência..."
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 -mx-1 px-1">
              {categories.map(cat => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">{cat}</p>
                  {filtered.filter(t => t.category === cat).map(type => (
                    <button key={type.id} type="button" onClick={() => selectType(type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 text-left transition-colors">
                      <span className="text-xl w-7 text-center">{type.emoji}</span>
                      <span className="text-sm text-gray-800">{type.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card>
        <SecTitle>Localização</SecTitle>
        <Field label="Área de Risco">
          <div className="flex gap-3 mt-1">
            {['Sim', 'Não'].map(opt => (
              <button key={opt} type="button"
                onClick={() => onChange({ riskArea: opt })}
                className={cn('flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-colors',
                  ro.riskArea === opt
                    ? 'bg-[#1B3A6B] border-[#1B3A6B] text-white'
                    : 'border-gray-300 text-gray-600 bg-white')}>
                {opt}
              </button>
            ))}
          </div>
        </Field>
      </Card>
    </div>
  );
}

export function StepDetalhes({ ro, onChange }: StepProps) {
  const type = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);
  const section = type?.section ?? 'generic';
  const setDF = (f: DF) => onChange({ dynamicFields: f });

  if (section === 'generic' || !type) {
    return (
      <Card>
        <div className="text-center py-8">
          <span className="text-5xl mb-3 block">✅</span>
          <p className="text-gray-500 text-sm font-medium">Sem campos adicionais para este tipo.</p>
          <p className="text-gray-400 text-xs mt-1">Continue para o próximo passo.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{type.emoji}</span>
        <SecTitle>{type.label}</SecTitle>
      </div>
      {section === 'trees'      && <TreesSection      fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'structural' && <StructuralSection fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'bees'       && <BeesSection       fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'animals'    && <AnimalsSection    fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'geological' && <GeologicalSection fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'hydrological' && <HydroSection   fields={ro.dynamicFields} onChange={setDF} />}
      {section === 'fire'       && <FireSection       fields={ro.dynamicFields} onChange={setDF} />}
    </Card>
  );
}

export function StepApoio({ ro, onChange }: StepProps) {
  const updateAgency = (id: string, updates: Partial<Agency>) =>
    onChange({ agencies: ro.agencies.map(a => a.id === id ? { ...a, ...updates } : a) });

  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Órgãos acionados</SecTitle>
        <div className="space-y-1">
          {ro.agencies.map(ag => (
            <div key={ag.id}>
              <label className="flex items-center gap-3 py-2 cursor-pointer select-none"
                onClick={() => updateAgency(ag.id, { selected: !ag.selected })}>
                <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                  ag.selected ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-300 bg-white')}>
                  {ag.selected && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span style={{ color: 'var(--text-main)' }} className="text-sm font-medium">{ag.label}</span>
              </label>
              {ag.selected && (
                <div className="ml-8 grid grid-cols-2 gap-2 mb-2">
                  <input value={ag.vehicles} onChange={e => updateAgency(ag.id, { vehicles: e.target.value })}
                    placeholder="Viaturas"
                    className="px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  <input value={ag.responsible} onChange={e => updateAgency(ag.id, { responsible: e.target.value })}
                    placeholder="Encarregado"
                    className="px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SecTitle>Perdas e Danos — Materiais</SecTitle>
        <div className="space-y-1 mb-4">
          {[['furniture','Móveis'],['food','Alimentos'],['clothes','Roupas'],['documents','Documentos'],['property','Imóvel'],['others','Outros']].map(([k,l]) => (
            <Checkbox key={k} checked={!!(ro.losses as unknown as Record<string,unknown>)[k]}
              onChange={v => onChange({ losses: { ...ro.losses, [k]: v } })} label={l} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['victims','Vítimas'],['injured','Feridos'],['deaths','Mortos']].map(([k,l]) => (
            <Field key={k} label={l}>
              <Input type="number" value={(ro.losses as unknown as Record<string,string>)[k]}
                onChange={v => onChange({ losses: { ...ro.losses, [k]: v } })} placeholder="0" />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function getGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 30000 }
    );
  });
}

export function StepFotos({ ro, onChange }: StepProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>, fromCamera: boolean) => {
    const files = e.target.files;
    if (!files) return;
    const gps = fromCamera ? await getGPS() : null;
    const newPhotos: Photo[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await compressImage(file);
      const photo: Photo = { id: genId(), dataUrl, caption: `Foto ${ro.photos.length + newPhotos.length + 1} – ` };
      if (gps) { photo.lat = gps.lat; photo.lng = gps.lng; }
      newPhotos.push(photo);
    }
    onChange({ photos: [...ro.photos, ...newPhotos] });
    if (inputRef.current) inputRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Cenário encontrado</SecTitle>
        <Textarea value={ro.photoScenario} onChange={v => onChange({ photoScenario: v })}
          placeholder="Descreva o cenário encontrado ao chegar no local..." rows={4} />
      </Card>

      <Card>
        <SecTitle>Fotos ({ro.photos.length})</SecTitle>
        {/* Câmera */}
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple
          onChange={e => handleFiles(e, true)} className="hidden" />
        {/* Galeria */}
        <input ref={galleryRef} type="file" accept="image/*" multiple
          onChange={e => handleFiles(e, false)} className="hidden" />
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1B3A6B] hover:text-[#1B3A6B] transition-colors">
            <Camera size={20} />
            <span className="text-sm font-semibold">Câmera</span>
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1B3A6B] hover:text-[#1B3A6B] transition-colors">
            <FileText size={20} />
            <span className="text-sm font-semibold">Galeria</span>
          </button>
        </div>

        <div className="space-y-4">
          {ro.photos.map((photo, idx) => (
            <div key={photo.id}>
              <div className="relative">
                <img src={photo.dataUrl} alt={`Foto ${idx + 1}`}
                  className="w-full rounded-xl object-cover max-h-64" />
                <button type="button" onClick={() => onChange({ photos: ro.photos.filter(p => p.id !== photo.id) })}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md">
                  <Trash2 size={14} />
                </button>
              </div>
              <input value={photo.caption}
                onChange={e => onChange({ photos: ro.photos.map(p => p.id === photo.id ? { ...p, caption: e.target.value } : p) })}
                placeholder={`Foto ${idx + 1} – Legenda...`}
                className="mt-2 w-full px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              {photo.lat != null && (
                <p className="text-[11px] text-green-700 mt-1 flex items-center gap-1">
                  📍 {photo.lat.toFixed(6)}, {photo.lng!.toFixed(6)}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}

export function StepConcluir({ ro, onChange }: StepProps) {
  const [showSecretarias, setShowSecretarias] = useState(false);

  const toggleDest = (s: string) => {
    const curr = ro.encaminharDest ?? [];
    onChange({ encaminharDest: curr.includes(s) ? curr.filter(d => d !== s) : [...curr, s] });
  };

  const statusConfig = [
    { id: 'encaminhar',    label: 'Encaminhar',            color: 'bg-blue-100 text-blue-700 border-blue-300',   activeColor: 'bg-blue-500 text-white border-blue-600' },
    { id: 'arquivar',      label: 'Arquivar / Finalizado', color: 'bg-green-100 text-green-700 border-green-300', activeColor: 'bg-green-500 text-white border-green-600' },
    { id: 'monitoramento', label: 'Monitoramento',         color: 'bg-orange-100 text-orange-700 border-orange-300', activeColor: 'bg-orange-500 text-white border-orange-600' },
  ] as const;

  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Observações</SecTitle>
        <Textarea value={ro.observations} onChange={v => onChange({ observations: v })}
          placeholder="Observações gerais sobre a ocorrência..." rows={4} />
      </Card>

      <Card>
        <SecTitle>Declarante</SecTitle>
        <div className="space-y-3">
          <Field label="Nome do Declarante">
            <Input value={ro.declarant1} onChange={v => onChange({ declarant1: v })} placeholder="Nome completo" />
          </Field>
          <Field label="Função / Vínculo">
            <Input value={ro.declarant1Role} onChange={v => onChange({ declarant1Role: v })} placeholder="Ex.: Morador, Proprietário..." />
          </Field>
          <Field label="Assinatura (escreva com o dedo)">
            <SignaturePad value={ro.declarant1Sig} onChange={v => onChange({ declarant1Sig: v })} />
          </Field>
        </div>
      </Card>

      <Card>
        <SecTitle>Agentes Participantes</SecTitle>
        <p className="text-xs text-gray-500 mb-3">Selecione todos os agentes que participaram da ocorrência</p>
        <AgentMultiPicker value={ro.agentParticipants ?? []} onChange={v => onChange({ agentParticipants: v })} />
      </Card>

      <Card>
        <SecTitle>Desfecho / Conclusão Final</SecTitle>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {statusConfig.map(s => (
            <button key={s.id} type="button"
              onClick={() => {
                onChange({ conclusionStatus: ro.conclusionStatus === s.id ? '' : s.id as OccurrenceReport['conclusionStatus'] });
                if (s.id !== 'encaminhar') onChange({ encaminharDest: [] });
                if (s.id === 'encaminhar' && ro.conclusionStatus !== 'encaminhar') setShowSecretarias(true);
              }}
              className={cn('py-3 px-2 rounded-xl border-2 font-bold text-sm transition-colors',
                ro.conclusionStatus === s.id ? s.activeColor : s.color)}>
              {s.label}
            </button>
          ))}
        </div>

        {ro.conclusionStatus === 'encaminhar' && (
          <div className="mb-3">
            <button type="button" onClick={() => setShowSecretarias(!showSecretarias)}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-semibold">
              <span>Secretarias / Departamentos</span>
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                {(ro.encaminharDest ?? []).length} selecionado(s)
              </span>
            </button>
            {showSecretarias && (
              <div className="mt-2 border border-blue-200 rounded-xl overflow-hidden">
                {SECRETARIAS.map(s => (
                  <button key={s} type="button" onClick={() => toggleDest(s)}
                    className={cn('w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 last:border-0 transition-colors',
                      (ro.encaminharDest ?? []).includes(s) ? 'bg-blue-50' : 'bg-white active:bg-gray-50')}>
                    <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                      (ro.encaminharDest ?? []).includes(s) ? 'bg-blue-500 border-blue-500' : 'border-gray-300')}>
                      {(ro.encaminharDest ?? []).includes(s) && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-xs text-gray-700">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Textarea value={ro.conclusion} onChange={v => onChange({ conclusion: v })}
          placeholder="Conclusão e providências finais..." rows={3} />
      </Card>

      {/* ── Auto de Interdição ── */}
      {(() => {
        const interdicao = {
          ...getDefaultInterdicao(ro.roNumber),
          ...(ro.interdicao || {}),
          numero: ro.interdicao?.numero || ro.roNumber || '',
          causas: Array.isArray(ro.interdicao?.causas) ? ro.interdicao.causas : [],
          danos: Array.isArray(ro.interdicao?.danos) ? ro.interdicao.danos : [],
          bensAfetados: Array.isArray(ro.interdicao?.bensAfetados) ? ro.interdicao.bensAfetados : [],
        };

        const updateInterdicao = (patch: Partial<OccurrenceReport['interdicao']>) => {
          onChange({
            interdicao: {
              ...interdicao,
              ...patch,
            },
          });
        };

        return (
          <>
            <Card>
              <SecTitle>Auto de Interdição</SecTitle>
              <Field label="Emitir Auto de Interdição?">
                <div className="flex gap-3 mt-1">
                  {['Sim', 'Não'].map(opt => {
                    const isActive = opt === 'Sim' ? !!interdicao.active : !interdicao.active;
                    return (
                      <button key={opt} type="button"
                        onClick={() => updateInterdicao({ active: opt === 'Sim', numero: interdicao.numero || ro.roNumber })}
                        className={cn('flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-colors',
                          isActive ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Card>

            {interdicao.active && (
              <div className="space-y-4">
                <Card>
                  <SecTitle>Identificação do Auto</SecTitle>
                  <div className="space-y-3">
                    <Field label="Nº do Auto de Interdição">
                      <Input value={interdicao.numero || ro.roNumber} onChange={v => updateInterdicao({ numero: v })} placeholder="Ex.: 001/2026" />
                    </Field>
                    <Field label="Ficha de Avaliação">
                      <Input value={interdicao.fichaAvaliacao || ''} onChange={v => updateInterdicao({ fichaAvaliacao: v })} placeholder="Nº da ficha" />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <SecTitle>1 — Causa da Interdição</SecTitle>
                  <div className="space-y-2">
                    {['Inundação','Enchente','Incêndio','Má Construção','Explosão','Desgaste Natural','Deslizamento de Terra','Desbarrancamento','Desabamento','Obras de Terceiros'].map(c => (
                      <button key={c} type="button"
                        onClick={() => {
                          const curr = interdicao.causas;
                          updateInterdicao({ causas: curr.includes(c) ? curr.filter(x => x !== c) : [...curr, c] });
                        }}
                        className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors',
                          interdicao.causas.includes(c) ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-700 border-gray-200')}>
                        <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                          interdicao.causas.includes(c) ? 'bg-white border-white' : 'border-gray-400')}>
                          {interdicao.causas.includes(c) && <Check size={12} className="text-[#1B3A6B]" />}
                        </div>
                        {c}
                      </button>
                    ))}
                    <Field label="Outros">
                      <Input value={interdicao.causaOutros || ''} onChange={v => updateInterdicao({ causaOutros: v })} placeholder="Descreva..." />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <SecTitle>2 — Danos Aparentes</SecTitle>
                  <div className="space-y-2">
                    {['Teto','Parede','Pisos','Estrutura','Fundações'].map(d => (
                      <button key={d} type="button"
                        onClick={() => {
                          const curr = interdicao.danos;
                          updateInterdicao({ danos: curr.includes(d) ? curr.filter(x => x !== d) : [...curr, d] });
                        }}
                        className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors',
                          interdicao.danos.includes(d) ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-700 border-gray-200')}>
                        <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                          interdicao.danos.includes(d) ? 'bg-white border-white' : 'border-gray-400')}>
                          {interdicao.danos.includes(d) && <Check size={12} className="text-[#1B3A6B]" />}
                        </div>
                        {d}
                      </button>
                    ))}
                    <Field label="Outros">
                      <Input value={interdicao.danosOutros || ''} onChange={v => updateInterdicao({ danosOutros: v })} placeholder="Descreva..." />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <SecTitle>3 — Bens Afetados</SecTitle>
                  <div className="space-y-3">
                    {[['particular','Particular'],['municipal','Municipal'],['estadual','Estadual']].map(([id, label]) => (
                      <div key={id}>
                        <button type="button"
                          onClick={() => {
                            const curr = interdicao.bensAfetados;
                            updateInterdicao({ bensAfetados: curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id] });
                          }}
                          className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors',
                            interdicao.bensAfetados.includes(id) ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-700 border-gray-200')}>
                          <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                            interdicao.bensAfetados.includes(id) ? 'bg-white border-white' : 'border-gray-400')}>
                            {interdicao.bensAfetados.includes(id) && <Check size={12} className="text-[#1B3A6B]" />}
                          </div>
                          {label}
                        </button>
                        {interdicao.bensAfetados.includes(id) && (
                          <div className="mt-2 pl-2">
                            <Input
                              inputMode="numeric"
                              value={id === 'particular' ? (interdicao.valorParticular || '') : id === 'municipal' ? (interdicao.valorMunicipal || '') : (interdicao.valorEstadual || '')}
                              onChange={v => {
                                const formatted = formatBRLInput(v);
                                const fieldKey = id === 'particular' ? 'valorParticular' : id === 'municipal' ? 'valorMunicipal' : 'valorEstadual';
                                updateInterdicao({ [fieldKey]: formatted });
                              }}
                              placeholder="R$ 0,00" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SecTitle>4 — Tipo de Interdição</SecTitle>
                  <div className="flex gap-3 mb-4">
                    {[['parcial','Parcial'],['total','Total']].map(([id, label]) => (
                      <button key={id} type="button"
                        onClick={() => updateInterdicao({ tipo: id as 'parcial' | 'total' })}
                        className={cn('flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-colors',
                          interdicao.tipo === id ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <Field label="Evacuará o imóvel?">
                    <div className="flex gap-3">
                      {[['sim','Sim'],['nao','Não']].map(([id, label]) => (
                        <button key={id} type="button"
                          onClick={() => updateInterdicao({ evacuarImovel: id as 'sim' | 'nao' })}
                          className={cn('flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-colors',
                            interdicao.evacuarImovel === id ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {interdicao.evacuarImovel === 'sim' && (
                    <div className="mt-3">
                      <Field label="Prazo para abandono (deixe vazio para Imediatamente)">
                        <Input value={interdicao.prazoAbandono || ''} onChange={v => updateInterdicao({ prazoAbandono: v })} placeholder="Ex.: 24 horas, 3 dias..." />
                      </Field>
                    </div>
                  )}
                </Card>

                <Card>
                  <SecTitle>5 — Destino do Morador</SecTitle>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      {[['parentes','Parentes / Vizinhos'],['outros','Outros']].map(([id, label]) => (
                        <button key={id} type="button"
                          onClick={() => updateInterdicao({ destinoMorador: id })}
                          className={cn('flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-colors',
                            interdicao.destinoMorador === id ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {interdicao.destinoMorador === 'outros' && (
                      <Input value={interdicao.destinoOutros || ''} onChange={v => updateInterdicao({ destinoOutros: v })} placeholder="Especifique..." />
                    )}
                    <Field label="Contato">
                      <Input value={interdicao.destinoContato || ''} onChange={v => updateInterdicao({ destinoContato: v })} placeholder="Nome para contato" />
                    </Field>
                    <Field label="Telefone">
                      <Input value={interdicao.destinoTelefone || ''} onChange={v => updateInterdicao({ destinoTelefone: v })} placeholder="(11) 00000-0000" />
                    </Field>
                    <Field label="Endereço de destino">
                      <Input value={interdicao.destinoEndereco || ''} onChange={v => updateInterdicao({ destinoEndereco: v })} placeholder="Endereço completo" />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <SecTitle>6 — Observações Importantes</SecTitle>
                  <Textarea value={interdicao.observacoes || ''} onChange={v => updateInterdicao({ observacoes: v })} rows={4} placeholder="Observações relevantes sobre a interdição..." />
                </Card>

                <Card>
                  <SecTitle>7 — Responsável pela Moradia / Testemunha</SecTitle>
                  <div className="space-y-3">
                    <Field label="Tipo">
                      <div className="grid grid-cols-2 gap-2">
                        {[['proprietario','Proprietário'],['morador','Morador'],['locatario','Locatário'],['testemunha','Testemunha']].map(([id, label]) => (
                          <button key={id} type="button"
                            onClick={() => updateInterdicao({ responsavelTipo: id as OccurrenceReport['interdicao']['responsavelTipo'] })}
                            className={cn('py-2.5 rounded-xl border-2 font-semibold text-sm transition-colors',
                              interdicao.responsavelTipo === id ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Nome">
                      <Input value={interdicao.responsavelNome || ''} onChange={v => updateInterdicao({ responsavelNome: v })} placeholder="Nome completo" />
                    </Field>
                    <Field label="RG">
                      <Input value={interdicao.responsavelRG || ''} onChange={v => updateInterdicao({ responsavelRG: v })} placeholder="Número do RG" />
                    </Field>
                    <Field label="Telefone">
                      <Input value={interdicao.responsavelTelefone || ''} onChange={v => updateInterdicao({ responsavelTelefone: v })} placeholder="(11) 00000-0000" />
                    </Field>
                    <Field label="Assinatura do responsável (escreva com o dedo)">
                      <SignaturePad value={interdicao.responsavelAssinatura || ''} onChange={v => updateInterdicao({ responsavelAssinatura: v })} />
                    </Field>
                  </div>
                </Card>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

// Componente de assinatura em canvas
