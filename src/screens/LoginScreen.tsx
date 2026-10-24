import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AlertTriangle } from 'lucide-react';
import { auth } from '../firebase';

export const TEAM_EMAIL = 'defesacivil0199@gmail.com';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  // Modo legado: o agente deixa o email em branco e usa a conta compartilhada
  const effectiveEmail = email.trim() || TEAM_EMAIL;
  const isLegacyMode = !email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, effectiveEmail, password);
      onLogin();
    } catch {
      setError(
        isLegacyMode
          ? 'Senha incorreta. Verifique e tente novamente.'
          : 'Email ou senha incorretos. Verifique e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1B3A6B] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🔶</p>
          <p className="text-white font-black text-xl tracking-wide">DEFESA CIVIL</p>
          <p className="text-blue-300 text-sm mt-1">Cajamar / SP</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <p className="font-bold text-gray-800 text-base mb-1">Acesso ao Sistema</p>
          <p className="text-xs text-gray-500 mb-5">Registro de Ocorrências</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Email (opcional)</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder={`Deixe em branco para usar ${TEAM_EMAIL}`}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                autoComplete="email"
              />
              {isLegacyMode && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Modo compartilhado — use seu email individual se disponível
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isLegacyMode ? 'Senha da equipe' : 'Sua senha individual'}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-xl">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !password}
              className="w-full py-4 rounded-2xl bg-[#1B3A6B] text-white font-bold text-sm disabled:opacity-50 active:opacity-80">
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-400 text-[11px] mt-6">
          Acesso restrito · Defesa Civil Cajamar
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// PIN SCREEN — identificação do agente pelo RE
// ─────────────────────────────────────────────
