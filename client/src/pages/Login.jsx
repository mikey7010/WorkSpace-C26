import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin(eMailToUse, pwdToUse) {
    setError('');
    setLoading(true);
    try {
      const user = await login(eMailToUse || email, pwdToUse || password);
      if (user.role === 'hr_admin' || user.role === 'admin') {
        navigate('/hr-dashboard', { replace: true });
      } else {
        navigate('/dept-dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  function submitForm(e) {
    e.preventDefault();
    handleLogin();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">WorkSpace C26 Plant Ops</h1>
            <p className="text-xs text-indigo-400 font-medium">Factory Master Headcount & 1,180+ Workforce Synchronization</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-1">Sign in to your portal</h2>
            <p className="text-xs text-slate-400">
              Access the C26 HR Command Center or Department Head Workspace.
            </p>
          </div>

          {error && (
            <p className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 font-medium">
              {error}
            </p>
          )}

          <form onSubmit={submitForm} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@workspace.app"
                className="w-full bg-slate-800/90 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/90 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-md shadow-indigo-600/20"
            >
              {loading ? 'Signing in…' : 'Sign in to C26 Platform'}
            </button>
          </form>

          {/* Quick Demo Logins with Actual Plant Names */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              1-Click Company Profiles (From C26 Spreadsheet)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLogin('hr@workspace.app', 'hr123')}
                className="text-left p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300">Priya Sharma</span>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded font-semibold">HR Head</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">hr@workspace.app</p>
              </button>

              <button
                type="button"
                onClick={() => handleLogin('tamil.assembly@workspace.app', 'dept123')}
                className="text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Tamil selvan</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold">Assembly (1st Wave)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">tamil.assembly@workspace.app</p>
              </button>

              <button
                type="button"
                onClick={() => handleLogin('rajasekar.cutting@workspace.app', 'dept123')}
                className="text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Rajasekar</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-semibold">Cutting (1st Wave)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">rajasekar.cutting@workspace.app</p>
              </button>

              <button
                type="button"
                onClick={() => handleLogin('johnny.gap@workspace.app', 'dept123')}
                className="text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Johnny</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold">GAP Regional Mgr</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">johnny.gap@workspace.app</p>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-3">
              Managers Balar (Director), Tulip (QC), Md. Imroz (Purchasing), Riti (IT), Dai wei (Sole), Eric (Lean) seeded with password: <code className="text-slate-400">dept123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
