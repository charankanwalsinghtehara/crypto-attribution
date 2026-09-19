import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPasswordByteLength, registerUser } from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username:"", email:"", password:"", confirm:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key, value) { setForm(v => ({ ...v, [key]: value })); }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const username = form.username.trim();
    const bytes = getPasswordByteLength(form.password);
    if (username.length < 3) return setError("Username must be at least 3 characters.");
    if (!form.password) return setError("Please enter a password.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await registerUser({ username, email: form.email.trim() || null, password: form.password });
      navigate("/login", { replace:true, state:{ registered:true } });
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand"><div className="brand-mark">C</div><span>Crypto Attribution</span></div>
        <h1>Create your account</h1>
        <p className="subtitle">Set up your identity to send protected documents and receive authorized decryption access.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label className="label">Username</label><input className="input" value={form.username} onChange={e=>update("username",e.target.value)} placeholder="At least 3 characters" autoComplete="username" /></div>
          <div className="form-group"><label className="label">Email <span className="muted">(optional)</span></label><input className="input" type="email" value={form.email} onChange={e=>update("email",e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
          <div className="form-group"><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={e=>update("password",e.target.value)} placeholder="Choose a strong password" autoComplete="new-password" /><div className="muted" style={{fontSize:12,marginTop:6}}>Use a strong password with a mix of letters, numbers and symbols.</div></div>
          <div className="form-group"><label className="label">Confirm password</label><input className="input" type="password" value={form.confirm} onChange={e=>update("confirm",e.target.value)} placeholder="Repeat your password" autoComplete="new-password" /></div>
          <button className="btn btn-primary" style={{width:"100%", padding:"13px"}} disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
        </form>
        <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
      </section>
    </main>
  );
}
