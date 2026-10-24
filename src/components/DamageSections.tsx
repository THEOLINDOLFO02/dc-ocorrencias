import { Toggle, Field, Input, Checkbox } from './ui';

export type DF = Record<string, unknown>;
export type DSProps = { fields: DF; onChange: (f: DF) => void };

export function TreesSection({ fields, onChange }: DSProps) {
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

export function StructuralSection({ fields, onChange }: DSProps) {
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

export function BeesSection({ fields, onChange }: DSProps) {
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

export function AnimalsSection({ fields, onChange }: DSProps) {
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

export function GeologicalSection({ fields, onChange }: DSProps) {
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

export function HydroSection({ fields, onChange }: DSProps) {
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

export function FireSection({ fields, onChange }: DSProps) {
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
// AGENT PICKER — modal de busca
// ─────────────────────────────────────────────
