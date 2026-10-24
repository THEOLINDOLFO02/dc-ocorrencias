import { useState, useEffect } from 'react';
import { type AgentIdentityState } from '../ro-utils';
import { Agent, AGENTS } from '../constants';

export function PinScreen({
  onConfirm,
  onCancel,
  identity,
}: {
  onConfirm: (agent: Agent) => void;
  onCancel: () => void;
  identity: AgentIdentityState | 'checking';
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (identity === 'checking' || identity.status !== 'individual') return;
    const found = AGENTS.find(a => a.re === identity.profile.re);
    if (found) onConfirm(found);
  }, [identity, onConfirm]);

  const handleConfirm = () => {
    const found = AGENTS.find(a => a.re === pin.trim());
    if (!found || found.name === 'OUTRO') {
      setError('RE não encontrado. Tente novamente.');
      setPin('');
      return;
    }
    onConfirm(found);
  };

  // Com perfil individual: mostra tela de confirmação de identidade (sem campo de PIN)
  if (identity === 'checking') {
    return <div className="min-h-screen bg-[#1B3A6B] grid place-items-center text-white">Verificando identidade…</div>;
  }

  if (identity.status === 'individual') {
    return (
      <div className="min-h-screen bg-[#1B3A6B] flex flex-col items-center justify-center px-6">
        <div style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} className="w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-5 border border-white/10">
          <div className="text-center">
            <div className="text-3xl mb-1">✅</div>
            <h2 className="text-lg font-black text-[#1B3A6B] dark:text-blue-400">Identidade Confirmada</h2>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">{identity.profile.display}</p>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">RE {identity.profile.re} · {identity.profile.role}</p>
          </div>
          <p className="text-xs text-center text-green-600">Iniciando R.O....</p>
        </div>
      </div>
    );
  }

  if (identity.status === 'unverified') {
    return (
      <div className="min-h-screen bg-[#1B3A6B] flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center space-y-4">
          <h2 className="font-bold text-red-700">Identidade não verificada</h2>
          <p className="text-sm text-gray-600">
            {identity.reason === 'profile-unavailable'
              ? 'Não foi possível consultar seu perfil. Conecte-se à internet e tente novamente.'
              : 'Esta conta ainda não tem um perfil de agente autorizado.'}
          </p>
          <button type="button" onClick={onCancel} className="w-full rounded-xl bg-[#1B3A6B] py-3 font-bold text-white">Voltar</button>
        </div>
      </div>
    );
  }

  // Sem perfil individual: modo legado — digita RE manualmente
  return (
    <div className="min-h-screen bg-[#1B3A6B] flex flex-col items-center justify-center px-6">
      <div style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }} className="w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-5 border border-white/10">
        <div className="text-center">
          <div className="text-3xl mb-1">🔶</div>
          <h2 className="text-lg font-black text-[#1B3A6B] dark:text-blue-400">Identificação</h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">Digite seu número de RE para preencher o R.O.</p>
          <p className="text-xs text-amber-600 mt-1">Conta legada compartilhada. O R.O. ficará identificado como criado por esta conta, e o nome selecionado é operacional.</p>
        </div>

        <div className="space-y-2">
          <label style={{ color: 'var(--text-main)' }} className="block text-xs font-bold uppercase tracking-wide opacity-80">Número de RE</label>
          <input
            type="number"
            inputMode="numeric"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            placeholder="Ex.: 20236"
            autoFocus
            className="w-full rounded-xl px-4 py-3 text-lg text-center font-mono font-bold tracking-widest focus:outline-none focus:border-[#1B3A6B]"
          />
          {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full bg-[#1B3A6B] text-white font-bold py-3 rounded-xl text-sm active:opacity-80"
        >
          Confirmar
        </button>
        <button
          onClick={onCancel}
          className="w-full text-gray-500 text-sm py-1 active:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ROOT APP
// ─────────────────────────────────────────────
