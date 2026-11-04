import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { login as apiLogin } from "../lib/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiLogin(username, password);
      login(res?.user);
      addToast("Berhasil masuk");
      navigate("/");
    } catch (err) {
      addToast(err.message || "Gagal masuk", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-ground text-ink">
      <div className="w-full max-w-[380px] scale-in">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-accent text-white flex items-center justify-center p-1.5 shrink-0">
            <img
              src="/favicon.svg"
              alt="DBSpot"
              className="w-full h-full object-contain filter invert"
            />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-ink leading-tight">
              DBSpot
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Diskominfo Kabupaten Tangerang 2026
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-[8px] border border-border p-6"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-sm font-medium text-ink mb-2"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-[38px] rounded-[6px] border border-control px-3 text-sm bg-surface text-ink focus:outline-none focus:border-accent placeholder:text-faint transition-colors"
                placeholder="Masukkan username"
                required
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-ink mb-2"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[38px] rounded-[6px] border border-control px-3 text-sm bg-surface text-ink focus:outline-none focus:border-accent placeholder:text-faint transition-colors"
                placeholder="Masukkan password"
                required
              />
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[38px] rounded-[6px] bg-ink px-4 text-sm font-medium text-white hover:bg-ink/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:translate-y-[0.5px]"
              >
                {loading ? "Memproses…" : "Masuk ke Konsol"}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/public/device-status"
            className="text-xs text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
          >
            <span>Lihat Status Mesin Absensi Publik</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
