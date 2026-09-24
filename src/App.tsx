/**
 * Defesa Civil Cajamar/SP — Sistema Digital de Registro de Ocorrências
 */
import { useState, useRef, useCallback } from 'react';
import {
  Camera, ChevronLeft, ChevronRight, Plus, Check,
  Trash2, X, Search, AlertTriangle, FileText, Clock, Printer, Pencil,
} from 'lucide-react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Screen = 'home' | 'wizard' | 'view' | 'print';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type SectionType = 'trees' | 'structural' | 'bees' | 'animals' | 'geological' | 'hydrological' | 'fire' | 'generic';

interface Photo {
  id: string;
  dataUrl: string;
  caption: string;
}

interface Agency {
  id: string;
  label: string;
  selected: boolean;
  vehicles: string;
  responsible: string;
}

interface Losses {
  furniture: boolean;
  food: boolean;
  clothes: boolean;
  documents: boolean;
  property: boolean;
  others: boolean;
  othersDesc: string;
  victims: string;
  injured: string;
  deaths: string;
}

interface OccurrenceReport {
  id: string;
  roNumber: string;
  emergency: boolean | null;
  vehicle: string;
  date: string;
  startTime: string;
  endTime: string;
  origin: string;
  agent: string;
  re: string;
  reporterName: string;
  rgCpf: string;
  phone: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  occurrenceTypeId: string;
  occurrenceTypeLabel: string;
  quadrant: string;
  riskArea: string;
  dynamicFields: Record<string, unknown>;
  agencies: Agency[];
  losses: Losses;
  photoScenario: string;
  photos: Photo[];
  photoConclusion: string;
  observations: string;
  declarant1: string;
  declarant2: string;
  filledBy: string;
  role: string;
  relatedDocs: string;
  conclusion: string;
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

interface OccurrenceType {
  id: string;
  label: string;
  emoji: string;
  category: string;
  section: SectionType;
}

const OCCURRENCE_TYPES: OccurrenceType[] = [
  // Árvores
  { id: 'supressao-arvore',   label: 'Supressão de Árvore',              emoji: '🪚', category: 'Árvores',        section: 'trees'        },
  { id: 'poda-galhos',        label: 'Poda / Corte de Galhos',           emoji: '✂️', category: 'Árvores',        section: 'trees'        },
  { id: 'vistoria-arvore',    label: 'Vistoria de Árvore',               emoji: '🌳', category: 'Árvores',        section: 'trees'        },
  // Estrutural
  { id: 'vistoria-estrutural',label: 'Vistoria Estrutural',              emoji: '🏚️', category: 'Estrutural',     section: 'structural'   },
  // Fauna
  { id: 'vistoria-insetos',   label: 'Vistoria de Insetos',              emoji: '🐝', category: 'Fauna',          section: 'bees'         },
  { id: 'manejo-abelhas',     label: 'Manejo de Abelhas',                emoji: '🍯', category: 'Fauna',          section: 'bees'         },
  { id: 'remocao-vespas',     label: 'Remoção de Vespas',                emoji: '🦟', category: 'Fauna',          section: 'bees'         },
  { id: 'resgate-fauna',      label: 'Resgate / Manejo de Fauna',        emoji: '🐍', category: 'Fauna',          section: 'animals'      },
  // Incêndio
  { id: 'combate-incendio',   label: 'Combate a Incêndio',               emoji: '🔥', category: 'Incêndio',       section: 'fire'         },
  // Geológico
  { id: 'risco-deslizamento', label: 'Risco de Deslizamento',            emoji: '⛰️', category: 'Geológico',      section: 'geological'   },
  // Hidrológico
  { id: 'alagamento',         label: 'Alagamento',                       emoji: '💧', category: 'Hidrológico',    section: 'hydrological' },
  { id: 'inundacao',          label: 'Inundação',                        emoji: '🌊', category: 'Hidrológico',    section: 'hydrological' },
  { id: 'enxurrada',          label: 'Enxurrada',                        emoji: '🌧️', category: 'Hidrológico',    section: 'hydrological' },
  // Infraestrutura
  { id: 'queda-poste',        label: 'Queda de Poste / Fio Elétrico',   emoji: '⚡', category: 'Infraestrutura', section: 'generic'      },
  { id: 'fixacao-placas',     label: 'Fixação / Manutenção de Placas',  emoji: '⚠️', category: 'Infraestrutura', section: 'generic'      },
  // Suprimentos
  { id: 'entrega-telhas',     label: 'Entrega de Telhas',                emoji: '🏠', category: 'Suprimentos',    section: 'generic'      },
  { id: 'entrega-lonas',      label: 'Entrega de Lonas',                 emoji: '🧱', category: 'Suprimentos',    section: 'generic'      },
  { id: 'entrega-agua',       label: 'Entrega de Água Potável',          emoji: '💧', category: 'Suprimentos',    section: 'generic'      },
  { id: 'caminhao-pipa',      label: 'Caminhão Pipa',                    emoji: '🚒', category: 'Suprimentos',    section: 'generic'      },
  // Resgate e Apoio
  { id: 'resgate-pessoas',    label: 'Resgate de Pessoas',               emoji: '🆘', category: 'Resgate e Apoio',section: 'generic'      },
  { id: 'apoio-operacional',  label: 'Apoio PM / GCM / Bombeiros / Trânsito', emoji: '🤝', category: 'Resgate e Apoio', section: 'generic' },
  { id: 'apoio-logistico',    label: 'Apoio Logístico',                  emoji: '📦', category: 'Resgate e Apoio',section: 'generic'      },
  { id: 'protecao-isolamento',label: 'Proteção / Isolamento de Local',   emoji: '🚧', category: 'Resgate e Apoio',section: 'generic'      },
  // Campanhas
  { id: 'campanha',           label: 'Campanha (Dengue / Raiva)',        emoji: '📢', category: 'Campanhas',      section: 'generic'      },
  // Outros
  { id: 'outros-servicos',    label: 'Outros Serviços',                  emoji: '📋', category: 'Outros',         section: 'generic'      },
];

const DEFAULT_AGENCIES: Agency[] = [
  { id: 'ambulancia', label: 'Ambulância',  selected: false, vehicles: '', responsible: '' },
  { id: 'bombeiro',   label: 'Bombeiro',    selected: false, vehicles: '', responsible: '' },
  { id: 'cetesb',     label: 'CETESB',      selected: false, vehicles: '', responsible: '' },
  { id: 'gcm',        label: 'GCM',         selected: false, vehicles: '', responsible: '' },
  { id: 'obras',      label: 'Obras',       selected: false, vehicles: '', responsible: '' },
  { id: 'pm-sp',      label: 'PM-SP',       selected: false, vehicles: '', responsible: '' },
  { id: 'pol-civil',  label: 'Pol. Civil',  selected: false, vehicles: '', responsible: '' },
  { id: 'transito',   label: 'Trânsito',    selected: false, vehicles: '', responsible: '' },
  { id: 'zoonoses',   label: 'Zoonoses',    selected: false, vehicles: '', responsible: '' },
];

const ORIGINS = [
  { id: '199',      label: '199'              },
  { id: 'PMC',      label: 'PMC'              },
  { id: 'ouvidoria',label: 'Ouvidoria'        },
  { id: 'procAdm',  label: 'Proc. Adm./Ofício'},
  { id: 'outros',   label: 'Outros'           },
];

const STEP_LABELS = ['Cabeçalho', 'Solicitante', 'Ocorrência', 'Detalhes', 'Apoio', 'Fotos', 'Concluir'];
const STORAGE_KEY = 'dc_ros_v1';

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 11);
}

function nextRONumber() {
  const yy = new Date().getFullYear().toString().slice(-2);
  const n = parseInt(localStorage.getItem('dc_ro_counter') || '0') + 1;
  localStorage.setItem('dc_ro_counter', String(n));
  return `${n}/${yy}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function createNewRO(): OccurrenceReport {
  return {
    id: genId(), roNumber: nextRONumber(), emergency: null,
    vehicle: '', date: todayISO(), startTime: nowHHMM(), endTime: '',
    origin: '', agent: '', re: '',
    reporterName: '', rgCpf: '', phone: '', address: '', addressNumber: '', neighborhood: '',
    occurrenceTypeId: '', occurrenceTypeLabel: '', quadrant: '', riskArea: '',
    dynamicFields: {},
    agencies: DEFAULT_AGENCIES.map(a => ({ ...a })),
    losses: { furniture: false, food: false, clothes: false, documents: false, property: false, others: false, othersDesc: '', victims: '', injured: '', deaths: '' },
    photoScenario: '', photos: [], photoConclusion: '',
    observations: '', declarant1: '', declarant2: '', filledBy: '', role: '', relatedDocs: '', conclusion: '',
    status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

async function compressImage(file: File): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.src = url;
  });
}

function cn(...c: (string | boolean | undefined | null)[]) {
  return c.filter(Boolean).join(' ');
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex-1 py-3 text-sm font-semibold rounded-xl transition-all',
        active ? 'bg-[#1B3A6B] text-white shadow-sm' : 'bg-gray-100 text-gray-600 active:bg-gray-200')}>
      {label}
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] focus:border-transparent" />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none" />
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
        checked ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-300 bg-white')}>
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('bg-white rounded-2xl p-4 shadow-sm border border-gray-100', className)}>{children}</div>;
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-[#1B3A6B] uppercase tracking-widest mb-3">{children}</p>;
}

// ─────────────────────────────────────────────
// DYNAMIC SECTIONS
// ─────────────────────────────────────────────

type DF = Record<string, unknown>;
type DSProps = { fields: DF; onChange: (f: DF) => void };

function TreesSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Há risco?">
        <div className="flex gap-2">
          <Toggle label="Sim — autorizar corte/poda" active={fields.hasRisk === true}  onClick={() => s('hasRisk', true)}  />
          <Toggle label="Não — orientar munícipe"    active={fields.hasRisk === false} onClick={() => s('hasRisk', false)} />
        </div>
      </Field>
      <Field label="Árvore já tombada?">
        <div className="flex gap-2">
          <Toggle label="Sim" active={fields.fallen === 'sim'} onClick={() => s('fallen', 'sim')} />
          <Toggle label="Não" active={fields.fallen === 'nao'} onClick={() => s('fallen', 'nao')} />
        </div>
      </Field>
      {fields.fallen === 'sim' && (
        <Field label="Quantidade">
          <Input value={String(fields.fallenCount ?? '')} onChange={v => s('fallenCount', v)} placeholder="Qtd de árvores" type="number" />
        </Field>
      )}
      {fields.hasRisk === true && (
        <Field label="O que foi feito?">
          <div className="space-y-1">
            <Checkbox checked={!!fields.detSupressao} onChange={v => s('detSupressao', v)} label="Determinação de Supressão" />
            <Checkbox checked={!!fields.supressao}    onChange={v => s('supressao', v)}    label="Supressão realizada"       />
          </div>
        </Field>
      )}
    </div>
  );
}

function StructuralSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Patologias identificadas">
        <div className="space-y-1">
          {[['fissuras','Fissuras'],['rachaduras','Rachaduras'],['recalque','Recalque'],['hidraulica','Hidráulica (vazamentos)']].map(([k,l]) => (
            <Checkbox key={k} checked={!!fields[k]} onChange={v => s(k, v)} label={l} />
          ))}
        </div>
      </Field>
      <Field label="Outras patologias">
        <Input value={String(fields.outrosPatologias ?? '')} onChange={v => s('outrosPatologias', v)} placeholder="Descreva..." />
      </Field>
      <Field label="Há risco?">
        <div className="flex gap-2">
          <Toggle label="Sim" active={fields.hasRisk === true}  onClick={() => s('hasRisk', true)}  />
          <Toggle label="Não" active={fields.hasRisk === false} onClick={() => s('hasRisk', false)} />
        </div>
      </Field>
      {fields.hasRisk === true && (
        <Field label="Extensão do risco">
          <div className="flex gap-2">
            {['Total','Parcial','Outros'].map(opt => (
              <Toggle key={opt} label={opt} active={fields.riskExtent === opt.toLowerCase()} onClick={() => s('riskExtent', opt.toLowerCase())} />
            ))}
          </div>
        </Field>
      )}
      <Field label="Causa humana (se houver)">
        <div className="space-y-1">
          <Checkbox checked={!!fields.barragemRompimento} onChange={v => s('barragemRompimento', v)} label="Rompimento de Barragem"  />
          <Checkbox checked={!!fields.sistemaDrenagem}    onChange={v => s('sistemaDrenagem', v)}    label="Sistema de Drenagem"    />
        </div>
      </Field>
    </div>
  );
}

function BeesSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Necessidade de retirada?">
        <div className="flex gap-2">
          <Toggle label="Sim — atacando"    active={fields.needsRemoval === true}  onClick={() => s('needsRemoval', true)}  />
          <Toggle label="Não — em formação" active={fields.needsRemoval === false} onClick={() => s('needsRemoval', false)} />
        </div>
      </Field>
      <Field label="Espécie">
        <div className="space-y-1">
          {['Europa','Jataí','Marimbondo','Vespa'].map(sp => (
            <Checkbox key={sp} checked={!!fields[sp.toLowerCase()]} onChange={v => s(sp.toLowerCase(), v)} label={sp} />
          ))}
        </div>
      </Field>
    </div>
  );
}

function AnimalsSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Espécie / Classificação">
        <div className="space-y-1">
          <Checkbox checked={!!fields.reptil}      onChange={v => s('reptil', v)}      label="Réptil"           />
          <Checkbox checked={!!fields.peconhento}  onChange={v => s('peconhento', v)}  label="Peçonhento"       />
          <Checkbox checked={!!fields.naoPecon}    onChange={v => s('naoPecon', v)}    label="Não Peçonhento"   />
        </div>
      </Field>
      <Field label="Outros">
        <Input value={String(fields.outros ?? '')} onChange={v => s('outros', v)} placeholder="Descreva o animal..." />
      </Field>
    </div>
  );
}

function GeologicalSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Tipo">
        <div className="flex gap-2">
          <Toggle label="Ameaça"       active={fields.type === 'ameaca'}   onClick={() => s('type', 'ameaca')}   />
          <Toggle label="Já ocorrido"  active={fields.type === 'ocorrido'} onClick={() => s('type', 'ocorrido')} />
        </div>
      </Field>
      <Field label="Ficha de Avaliação nº">
        <Input value={String(fields.fichaAvaliacao ?? '')} onChange={v => s('fichaAvaliacao', v)} placeholder="Número da ficha" />
      </Field>
      <Field label="Auto de Interdição nº">
        <Input value={String(fields.autoInterdicao ?? '')} onChange={v => s('autoInterdicao', v)} placeholder="Número do auto" />
      </Field>
    </div>
  );
}

function HydroSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Causa">
        <div className="space-y-1">
          <Checkbox checked={!!fields.chuva}        onChange={v => s('chuva', v)}        label="Chuva"        />
          <Checkbox checked={!!fields.assoreamento} onChange={v => s('assoreamento', v)} label="Assoreamento" />
        </div>
      </Field>
      <Field label="Outro">
        <Input value={String(fields.outro ?? '')} onChange={v => s('outro', v)} placeholder="Descreva..." />
      </Field>
    </div>
  );
}

function FireSection({ fields, onChange }: DSProps) {
  const s = (k: string, v: unknown) => onChange({ ...fields, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Tipo de incêndio">
        <div className="grid grid-cols-2 gap-2">
          {[['urbano','Urbano'],['florestal','Florestal'],['industrial','Industrial'],['residencial','Residencial']].map(([id,lbl]) => (
            <Toggle key={id} label={lbl} active={fields.type === id} onClick={() => s('type', id)} />
          ))}
        </div>
      </Field>
      <Field label="Outros">
        <Input value={String(fields.outros ?? '')} onChange={v => s('outros', v)} placeholder="Descreva..." />
      </Field>
    </div>
  );
}

// ─────────────────────────────────────────────
// WIZARD STEPS
// ─────────────────────────────────────────────

type StepProps = { ro: OccurrenceReport; onChange: (u: Partial<OccurrenceReport>) => void };

function StepCabecalho({ ro, onChange }: StepProps) {
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
            <Input value={ro.roNumber} onChange={v => onChange({ roNumber: v })} placeholder="Ex: 602/26" />
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
        <SecTitle>Equipe</SecTitle>
        <div className="space-y-3">
          <Field label="Viatura" required>
            <Input value={ro.vehicle} onChange={v => onChange({ vehicle: v })} placeholder="Ex: 001, 002..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Agente">
              <Input value={ro.agent} onChange={v => onChange({ agent: v })} placeholder="Nome" />
            </Field>
            <Field label="RE">
              <Input value={ro.re} onChange={v => onChange({ re: v })} placeholder="13611" />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle>Canal de entrada</SecTitle>
        <div className="grid grid-cols-2 gap-2">
          {ORIGINS.map(o => (
            <Toggle key={o.id} label={o.label} active={ro.origin === o.id} onClick={() => onChange({ origin: o.id })} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function StepSolicitante({ ro, onChange }: StepProps) {
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
        </div>
      </Card>

      <Card>
        <SecTitle>Endereço da Ocorrência</SecTitle>
        <div className="space-y-3">
          <Field label="Logradouro" required>
            <Input value={ro.address} onChange={v => onChange({ address: v })} placeholder="Rua, Av., Estrada..." />
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

function StepOcorrencia({ ro, onChange }: StepProps) {
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
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
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
              {/* Tipo personalizado */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Personalizado</p>
                <button type="button"
                  onClick={() => {
                    const lbl = search.trim() || 'Outro';
                    onChange({ occurrenceTypeId: 'custom', occurrenceTypeLabel: lbl, dynamicFields: {} });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 text-left">
                  <span className="text-xl w-7 text-center">📋</span>
                  <span className="text-sm text-gray-800">{search ? `Usar "${search}"` : 'Outro tipo...'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card>
        <SecTitle>Localização</SecTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quadrante">
            <Input value={ro.quadrant} onChange={v => onChange({ quadrant: v })} placeholder="Q1, Q2..." />
          </Field>
          <Field label="Área de Risco">
            <Input value={ro.riskArea} onChange={v => onChange({ riskArea: v })} placeholder="Sim / Não" />
          </Field>
        </div>
      </Card>
    </div>
  );
}

function StepDetalhes({ ro, onChange }: StepProps) {
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

function StepApoio({ ro, onChange }: StepProps) {
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
                <span className="text-sm text-gray-800">{ag.label}</span>
              </label>
              {ag.selected && (
                <div className="ml-8 grid grid-cols-2 gap-2 mb-2">
                  <input value={ag.vehicles} onChange={e => updateAgency(ag.id, { vehicles: e.target.value })}
                    placeholder="Viaturas"
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  <input value={ag.responsible} onChange={e => updateAgency(ag.id, { responsible: e.target.value })}
                    placeholder="Encarregado"
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
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

function StepFotos({ ro, onChange }: StepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: Photo[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await compressImage(file);
      newPhotos.push({ id: genId(), dataUrl, caption: `Foto ${ro.photos.length + newPhotos.length + 1} – ` });
    }
    onChange({ photos: [...ro.photos, ...newPhotos] });
    if (inputRef.current) inputRef.current.value = '';
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
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple
          onChange={handleFiles} className="hidden" />
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1B3A6B] hover:text-[#1B3A6B] transition-colors mb-3">
          <Camera size={20} />
          <span className="text-sm font-semibold">Tirar foto / Adicionar imagem</span>
        </button>

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
                className="mt-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SecTitle>Desfecho / Conclusão do Registro Fotográfico</SecTitle>
        <Textarea value={ro.photoConclusion} onChange={v => onChange({ photoConclusion: v })}
          placeholder="Providências tomadas e encaminhamento dado..." rows={4} />
      </Card>
    </div>
  );
}

function StepConcluir({ ro, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <Card>
        <SecTitle>Observações</SecTitle>
        <Textarea value={ro.observations} onChange={v => onChange({ observations: v })}
          placeholder="Observações gerais sobre a ocorrência..." rows={4} />
      </Card>

      <Card>
        <SecTitle>Assinaturas</SecTitle>
        <div className="space-y-3">
          <Field label="Nome do Declarante 1">
            <Input value={ro.declarant1} onChange={v => onChange({ declarant1: v })} placeholder="Nome completo" />
          </Field>
          <Field label="Nome do Declarante 2">
            <Input value={ro.declarant2} onChange={v => onChange({ declarant2: v })} placeholder="Nome completo" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preenchido por">
              <Input value={ro.filledBy} onChange={v => onChange({ filledBy: v })} placeholder="Nome do agente" />
            </Field>
            <Field label="Cargo">
              <Input value={ro.role} onChange={v => onChange({ role: v })} placeholder="Cargo / função" />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SecTitle>Documentos Relacionados</SecTitle>
        <Textarea value={ro.relatedDocs} onChange={v => onChange({ relatedDocs: v })}
          placeholder="Documentos relacionados..." rows={2} />
      </Card>

      <Card>
        <SecTitle>Desfecho / Conclusão Final</SecTitle>
        <Textarea value={ro.conclusion} onChange={v => onChange({ conclusion: v })}
          placeholder="Conclusão e providências finais..." rows={3} />
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// WIZARD
// ─────────────────────────────────────────────

function WizardScreen({ ro, onUpdate, onSave, onCancel }: {
  ro: OccurrenceReport;
  onUpdate: (u: Partial<OccurrenceReport>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const TOTAL = 7;

  const goNext = () => {
    if (step < TOTAL) { setStep((step + 1) as WizardStep); window.scrollTo(0, 0); }
    else onSave();
  };
  const goBack = () => {
    if (step > 1) { setStep((step - 1) as WizardStep); window.scrollTo(0, 0); }
    else onCancel();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────

function HomeScreen({ ros, onNew, onView }: {
  ros: OccurrenceReport[]; onNew: () => void; onView: (r: OccurrenceReport) => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#1B3A6B] text-white">
        <div className="px-4 pt-12 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-black text-white">DC</span>
            </div>
            <div>
              <p className="text-xs text-blue-300 font-medium">Defesa Civil — Cajamar/SP</p>
              <p className="font-bold text-lg leading-tight">Registro de Ocorrências</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 pb-28">
        {ros.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={52} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-semibold">Nenhum R.O. registrado</p>
            <p className="text-gray-400 text-sm mt-1">Toque em "+ Novo R.O." para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Registros ({ros.length})
            </p>
            {[...ros].reverse().map(ro => {
              const type = OCCURRENCE_TYPES.find(t => t.id === ro.occurrenceTypeId);
              return (
                <button key={ro.id} type="button" onClick={() => onView(ro)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left flex items-start gap-3 active:bg-gray-50">
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                    {type?.emoji ?? '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-bold text-[#1B3A6B] text-sm">R.O. {ro.roNumber}</span>
                      <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-semibold',
                        ro.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                        {ro.status === 'completed' ? 'Concluído' : 'Rascunho'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium truncate">
                      {ro.occurrenceTypeLabel || 'Tipo não definido'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {fmtDate(ro.date)} {ro.startTime && `às ${ro.startTime}`}
                      </span>
                      {ro.neighborhood && <span className="truncate">{ro.neighborhood}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-4 right-4">
        <button type="button" onClick={onNew}
          className="w-full bg-[#1B3A6B] text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base active:bg-[#142d52]">
          <Plus size={22} /> Novo R.O.
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VIEW R.O.
// ─────────────────────────────────────────────

function ViewROScreen({ ro, onBack, onPrint, onEdit }: { ro: OccurrenceReport; onBack: () => void; onPrint: () => void; onEdit: () => void }) {
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
          <Row label="Agente"       value={ro.agent ? `${ro.agent}${ro.re ? ` (RE: ${ro.re})` : ''}` : null} />
          <Row label="Origem"       value={ro.origin} />
        </Sec>

        <Sec title="Solicitante">
          <Row label="Nome"      value={ro.reporterName} />
          <Row label="RG/CPF"   value={ro.rgCpf} />
          <Row label="Telefone" value={ro.phone} />
          <Row label="Endereço" value={[ro.address, ro.addressNumber].filter(Boolean).join(', ')} />
          <Row label="Bairro"   value={ro.neighborhood} />
        </Sec>

        <Sec title="Ocorrência">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{type?.emoji ?? '📋'}</span>
            <span className="text-sm font-bold text-gray-800">{ro.occurrenceTypeLabel}</span>
          </div>
          <Row label="Quadrante"    value={ro.quadrant} />
          <Row label="Área de risco" value={ro.riskArea} />
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
            {ro.photoConclusion && (
              <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                {ro.photoConclusion}
              </p>
            )}
          </Sec>
        )}

        {ro.conclusion && (
          <Sec title="Desfecho / Conclusão">
            <p className="text-sm text-gray-700 leading-relaxed">{ro.conclusion}</p>
          </Sec>
        )}

        <Sec title="Assinaturas">
          <Row label="Declarante 1"  value={ro.declarant1} />
          <Row label="Declarante 2"  value={ro.declarant2} />
          <Row label="Preenchido por" value={[ro.filledBy, ro.role].filter(Boolean).join(' — ')} />
        </Sec>

        <div className="flex gap-3 mt-2 mb-4">
          <button type="button" onClick={onEdit}
            className="flex-1 py-4 rounded-2xl bg-[#1B3A6B] text-white font-bold text-sm flex items-center justify-center gap-2 active:opacity-80">
            <Pencil size={18} /> Editar
          </button>
          <button type="button" onClick={onPrint}
            className="flex-1 py-4 rounded-2xl border-2 border-[#1B3A6B] text-[#1B3A6B] font-bold text-sm flex items-center justify-center gap-2 active:bg-blue-50">
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PRINT SCREEN
// ─────────────────────────────────────────────

function PrintScreen({ ro, onClose }: { ro: OccurrenceReport; onClose: () => void }) {
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

  const TLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="font-bold text-[9px] uppercase block leading-tight text-gray-600">{children}</span>
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
              <TCell className="w-16 text-center border-r-2 border-gray-700">
                <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-500 text-xs">DC</div>
                <div className="font-black text-[9px] mt-0.5">DEFESA CIVIL</div>
                <div className="text-[8px] text-gray-500">Cajamar/SP</div>
              </TCell>
              <TCell className="text-center border-r-2 border-gray-700">
                <div className="font-black text-base text-gray-800 tracking-wide">RELATÓRIO DE OCORRÊNCIA</div>
              </TCell>
              <TCell className="w-32 text-right">
                <TLabel>Emergência</TLabel>
                <div className="text-[10px] mt-0.5">
                  <CB v={ro.emergency === true} /> Sim &nbsp;
                  <CB v={ro.emergency === false} /> Não
                </div>
              </TCell>
            </tr>

            <tr className="border-t border-gray-500">
              <TCell><TLabel>Número</TLabel><TValue>{ro.roNumber}</TValue></TCell>
              <TCell><TLabel>Viatura</TLabel><TValue>{ro.vehicle}</TValue></TCell>
              <TCell><TLabel>Data</TLabel><TValue>{fmtDate(ro.date)}</TValue></TCell>
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
                <TLabel>Quadrante / Área de Risco</TLabel>
                <TValue>{[ro.quadrant, ro.riskArea].filter(Boolean).join(' / ')}</TValue>
              </TCell>
            </tr>

            <tr>
              <TCell>
                <TLabel>Hora inicial</TLabel><TValue>{ro.startTime}</TValue>
              </TCell>
              <TCell>
                <TLabel>Hora final</TLabel><TValue>{ro.endTime}</TValue>
              </TCell>
              <TCell>
                <TLabel>Origem</TLabel>
                <div className="flex flex-wrap gap-x-2 mt-0.5 text-[10px]">
                  {ORIGINS.map(o => <span key={o.id}><CB v={ro.origin === o.id} />{o.label}</span>)}
                </div>
              </TCell>
            </tr>

            {/* ─ Agente ─ */}
            <tr>
              <TCell>
                <TLabel>Agente</TLabel><TValue>{ro.agent}</TValue>
              </TCell>
              <TCell>
                <TLabel>RE</TLabel><TValue>{ro.re}</TValue>
              </TCell>
              <TCell>
                <TLabel>Preenchido por / Cargo</TLabel>
                <TValue>{[ro.filledBy, ro.role].filter(Boolean).join(' / ')}</TValue>
              </TCell>
            </tr>

            {/* ─ Seção dinâmica ─ */}
            {renderDynamic()}

            {/* ─ 2A Apoio ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">2.A — APOIO E/OU ACIONAMENTO NA OCORRÊNCIA</span></TCell>
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

            {/* ─ 2B Perdas e Danos ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">2.B — PERDAS E DANOS — MATERIAIS</span></TCell>
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
                <TLabel>Nome do Declarante 1</TLabel>
                <TValue>{ro.declarant1}</TValue>
                <div className="mt-4 border-t border-gray-400 text-[9px] text-gray-500">Assinatura</div>
              </TCell>
              <TCell>
                <TLabel>Nome do Declarante 2</TLabel>
                <TValue>{ro.declarant2}</TValue>
                <div className="mt-4 border-t border-gray-400 text-[9px] text-gray-500">Assinatura</div>
              </TCell>
              <TCell>
                <TLabel>Preenchido por / Cargo</TLabel>
                <TValue>{ro.filledBy}</TValue>
                <TValue className="text-gray-500">{ro.role}</TValue>
                <div className="mt-4 border-t border-gray-400 text-[9px] text-gray-500">Assinatura</div>
              </TCell>
            </tr>

            {/* ─ Desfecho ─ */}
            <tr className="border-t-2 border-gray-700 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">DOCUMENTOS RELACIONADOS</span></TCell>
            </tr>
            <tr>
              <TCell colSpan={3}><div className="min-h-[20px] text-[10px]">{ro.relatedDocs}</div></TCell>
            </tr>
            <tr className="border-t border-gray-500 bg-gray-50">
              <TCell colSpan={3}><span className="font-black text-[10px]">DESFECHO / CONCLUSÃO</span></TCell>
            </tr>
            <tr>
              <TCell colSpan={3}><div className="min-h-[30px] whitespace-pre-wrap text-[10px]">{ro.conclusion}</div></TCell>
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
              {/* Header */}
              <tr>
                <td colSpan={2} className="border border-gray-500 px-3 py-2">
                  <div className="font-black text-center text-base text-gray-800 mb-1">REGISTRO FOTOGRÁFICO</div>
                  <div className="font-black text-center text-[11px] text-[#1B3A6B]">
                    🔶 DEFESA CIVIL — RELATÓRIO DE OCORRÊNCIA
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
                  <strong>Equipe:</strong> {ro.agent}{ro.re ? ` (RE: ${ro.re})` : ''}
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
                            </div>
                          </>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Desfecho fotográfico */}
              <tr>
                <td colSpan={2} className="border border-gray-500 px-2 py-1 bg-gray-50">
                  <div className="font-black text-[10px] mb-1">📋 DESFECHO / CONCLUSÃO</div>
                  <div className="text-[10px] whitespace-pre-wrap min-h-[40px]">{ro.photoConclusion}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="no-print h-8" />
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [ros, setRos] = useState<OccurrenceReport[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });
  const [currentRO, setCurrentRO] = useState<OccurrenceReport | null>(null);
  const editMode = useRef(false);

  const persist = useCallback((updated: OccurrenceReport[]) => {
    setRos(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const handleNew = () => {
    editMode.current = false;
    setCurrentRO(createNewRO());
    setScreen('wizard');
  };

  const handleUpdate = useCallback((updates: Partial<OccurrenceReport>) => {
    setCurrentRO(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null);
  }, []);

  const handleSave = useCallback(() => {
    if (!currentRO) return;
    const saved = { ...currentRO, status: 'completed' as const, updatedAt: new Date().toISOString() };
    const idx = ros.findIndex(r => r.id === saved.id);
    persist(idx >= 0 ? ros.map((r, i) => i === idx ? saved : r) : [...ros, saved]);
    setCurrentRO(saved);
    setScreen('view');
  }, [currentRO, ros, persist]);

  const handleCancel = useCallback(() => {
    if (editMode.current && currentRO) {
      setScreen('view');
      return;
    }
    if (currentRO) {
      const draft = { ...currentRO, status: 'draft' as const };
      const idx = ros.findIndex(r => r.id === draft.id);
      persist(idx >= 0 ? ros.map((r, i) => i === idx ? draft : r) : [...ros, draft]);
    }
    setScreen('home');
    setCurrentRO(null);
  }, [currentRO, ros, persist]);

  const handleView = (ro: OccurrenceReport) => { setCurrentRO(ro); setScreen('view'); };
  const handleBack = () => { setScreen('home'); setCurrentRO(null); };
  const handleEdit = () => { editMode.current = true; setScreen('wizard'); };

  if (screen === 'wizard' && currentRO)
    return <WizardScreen ro={currentRO} onUpdate={handleUpdate} onSave={handleSave} onCancel={handleCancel} />;

  if (screen === 'print' && currentRO)
    return <PrintScreen ro={currentRO} onClose={() => setScreen('view')} />;

  if (screen === 'view' && currentRO)
    return <ViewROScreen ro={currentRO} onBack={handleBack} onPrint={() => setScreen('print')} onEdit={handleEdit} />;

  return <HomeScreen ros={ros} onNew={handleNew} onView={handleView} />;
}
