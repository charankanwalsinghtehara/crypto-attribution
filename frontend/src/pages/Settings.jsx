import {
  Bell,
  Database,
  LockKeyhole,
  Save,
  Server,
  ShieldCheck
} from "lucide-react";

import { useState } from "react";

import PageHeader from "../components/PageHeader";

function Settings() {
  const [apiUrl, setApiUrl] = useState(
    () =>
      localStorage.getItem("crypto_attribution_api_url") ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://127.0.0.1:8000"
  );

  const [notifications, setNotifications] = useState(true);
  const [autoVerify, setAutoVerify] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave(event) {
    event.preventDefault();

    localStorage.setItem("crypto_attribution_api_url", apiUrl.replace(/\/+$/, ""));
    localStorage.setItem(
      "crypto_notifications",
      String(notifications)
    );
    localStorage.setItem(
      "crypto_auto_verify",
      String(autoVerify)
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="PLATFORM CONFIGURATION"
        title="Settings"
        description="Configure frontend connection and security preferences."
      />

      <form
        className="settings-grid"
        onSubmit={handleSave}
      >
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Backend connection</h3>
              <p>Configure the FastAPI server address.</p>
            </div>

            <Server size={20} className="panel-header-icon" />
          </div>

          <div className="form-group">
            <label htmlFor="apiUrl">
              API base URL
            </label>

            <input
              id="apiUrl"
              type="url"
              value={apiUrl}
              onChange={(event) =>
                setApiUrl(event.target.value)
              }
              placeholder="http://127.0.0.1:8000"
            />
          </div>

          <div className="connection-status">
            <span className="status-dot" />

            Backend address configured
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Security preferences</h3>
              <p>Control local frontend behavior.</p>
            </div>

            <ShieldCheck size={20} className="panel-header-icon" />
          </div>

          <label className="setting-toggle">
            <span className="setting-toggle-icon">
              <Bell size={18} />
            </span>

            <span className="setting-toggle-content">
              <strong>Notifications</strong>
              <small>Show platform notifications.</small>
            </span>

            <input
              type="checkbox"
              checked={notifications}
              onChange={(event) =>
                setNotifications(event.target.checked)
              }
            />
          </label>

          <label className="setting-toggle">
            <span className="setting-toggle-icon">
              <LockKeyhole size={18} />
            </span>

            <span className="setting-toggle-content">
              <strong>Automatic verification</strong>
              <small>
                Display verification status after operations.
              </small>
            </span>

            <input
              type="checkbox"
              checked={autoVerify}
              onChange={(event) =>
                setAutoVerify(event.target.checked)
              }
            />
          </label>

          <label className="setting-toggle">
            <span className="setting-toggle-icon">
              <Database size={18} />
            </span>

            <span className="setting-toggle-content">
              <strong>Database-backed records</strong>
              <small>
                Records must always come from the backend.
              </small>
            </span>

            <input
              type="checkbox"
              checked
              disabled
              readOnly
            />
          </label>
        </section>

        <div className="settings-actions">
          {saved && (
            <span className="save-success">
              Settings saved
            </span>
          )}

          <button
            type="submit"
            className="primary-button"
          >
            <Save size={17} />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;