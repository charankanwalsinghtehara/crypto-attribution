import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (username.trim().length < 3) return setError("Username must be at least 3 characters.");
    if (!password) return setError("Please enter your password.");
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand"><div className="brand-mark">C</div><span>Crypto Attribution</span></div>
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to securely manage protected documents, recipients, attribution and the audit ledger.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label className="label">Username</label><input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" /></div>
          <div className="form-group"><label className="label">Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" /></div>
          <button className="btn btn-primary" style={{width:"100%", padding:"13px"}} disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <div className="auth-footer">Don't have an account? <Link to="/register">Create one</Link></div>
      </section>
    </main>
  );
}
