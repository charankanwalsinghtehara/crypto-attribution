import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileUp, LoaderCircle, Trash2, UserRound } from "lucide-react";
import { getUsers, uploadDocument } from "../api";
import { useAuth } from "../context/AuthContext";

export default function UploadDocument() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [recipientIds, setRecipientIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const recipients = useMemo(
    () => users.filter(u => u.id !== user?.id),
    [users, user]
  );

  function toggleRecipient(id) {
    setRecipientIds(current =>
      current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!file) return setError("Please choose a file.");
    if (!title.trim()) return setError("Please enter a title.");
    if (!user?.id) return setError("Your session is not ready.");
    if (!recipientIds.length) return setError("Select at least one recipient.");

    setBusy(true);
    try {
      await uploadDocument({
        file,
        title: title.trim(),
        senderId: user.id,
        recipientIds,
      });
      setSuccess("Document uploaded successfully.");
      setTitle("");
      setFile(null);
      setRecipientIds([]);
      const input = document.getElementById("document-file");
      if (input) input.value = "";
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{padding: "2rem", maxWidth: 900}}>
      <h1>Upload Document</h1>
      <p><UserRound size={16} /> Sender: <strong>{user?.username || "Loading…"}</strong></p>

      <form onSubmit={submit}>
        <label>
          Title
          <input value={title} onChange={e => setTitle(e.target.value)} required />
        </label>

        <label>
          PDF / source file
          <input id="document-file" type="file" onChange={e => setFile(e.target.files?.[0] || null)} required />
        </label>

        <fieldset>
          <legend>Recipients</legend>
          {loading ? <p>Loading users…</p> : recipients.length === 0 ? (
            <p>No other registered users are available.</p>
          ) : recipients.map(u => (
            <label key={u.id} style={{display: "block"}}>
              <input
                type="checkbox"
                checked={recipientIds.includes(u.id)}
                onChange={() => toggleRecipient(u.id)}
              />
              {u.username}
            </label>
          ))}
        </fieldset>

        {error && <p role="alert">{error}</p>}
        {success && <p role="status"><CheckCircle2 size={16} /> {success}</p>}

        <button disabled={busy || loading}>
          {busy ? <><LoaderCircle size={16} /> Uploading…</> : <><FileUp size={16} /> Upload</>}
        </button>
        {file && (
          <button type="button" onClick={() => {
            setFile(null);
            const input = document.getElementById("document-file");
            if (input) input.value = "";
          }}>
            <Trash2 size={16} /> Remove file
          </button>
        )}
      </form>
    </main>
  );
}
