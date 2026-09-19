import { useEffect, useState } from "react";
import {
  Activity,
  Archive,
  CheckCircle2,
  Database,
  FileCheck2,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

import {
  getDocuments,
  getDecryptionEvents,
  getHealth,
  getLedgerBlocks,
  verifyLedger,
} from "../api";

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [events, setEvents] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [health, setHealth] = useState(null);
  const [ledgerIntegrity, setLedgerIntegrity] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        documentsData,
        eventsData,
        ledgerData,
        healthData,
        verificationData,
      ] = await Promise.all([
        getDocuments(),
        getDecryptionEvents(),
        getLedgerBlocks(),
        getHealth(),
        verifyLedger(),
      ]);

      setDocuments(Array.isArray(documentsData) ? documentsData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setLedger(Array.isArray(ledgerData) ? ledgerData : []);
      setHealth(healthData);
      setLedgerIntegrity(verificationData?.ledger_integrity ?? false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const latestDocuments = documents.slice(0, 5);
  const latestEvents = events.slice(0, 5);

  return (
    <div className="page">
      <PageHeader
        eyebrow="SECURITY OPERATIONS"
        title="Dashboard"
        description="Live overview of the cryptographic attribution backend."
        action={
          <button
            className="secondary-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="error-message">
          Backend error: {error}
        </div>
      )}

      <section className="stats-grid">
        <StatCard
          label="Documents"
          value={documents.length}
          description="Stored in PostgreSQL"
          icon={Archive}
          tone="blue"
        />

        <StatCard
          label="Decryption Events"
          value={events.length}
          description="Recorded provenance events"
          icon={FileCheck2}
          tone="purple"
        />

        <StatCard
          label="Ledger Blocks"
          value={ledger.length}
          description="Hash-chain records"
          icon={Database}
          tone="green"
        />

        <StatCard
          label="System"
          value={health?.status === "ok" ? "Online" : "Offline"}
          description={
            health?.database
              ? `${health.database} connected`
              : "Checking backend"
          }
          icon={Server}
          tone="blue"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-large-panel">
          <div className="panel-header">
            <div>
              <h3>Recent Documents</h3>
              <p>Latest records from PostgreSQL.</p>
            </div>

            <Link to="/documents" className="text-link">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="loading-state">
              Loading...
            </div>
          ) : latestDocuments.length === 0 ? (
            <div className="empty-inline">
              No documents uploaded yet.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Sender</th>
                    <th>Hash</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {latestDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.title}</strong>
                        <span className="table-secondary">
                          {doc.filename}
                        </span>
                      </td>

                      <td>User #{doc.sender_id}</td>

                      <td>
                        <code>
                          {doc.original_content_hash
                            ? `${doc.original_content_hash.slice(0, 12)}...`
                            : "N/A"}
                        </code>
                      </td>

                      <td>
                        {doc.created_at
                          ? new Date(
                              doc.created_at
                            ).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>System Health</h3>
              <p>Live backend status.</p>
            </div>

            <Activity size={19} />
          </div>

          <div className="health-list">
            <div className="health-row">
              <div>
                <strong>API</strong>
                <span>FastAPI server</span>
              </div>

              <StatusBadge
                status={
                  health?.status === "ok"
                    ? "Online"
                    : "Offline"
                }
              />
            </div>

            <div className="health-row">
              <div>
                <strong>Database</strong>
                <span>PostgreSQL</span>
              </div>

              <StatusBadge
                status={
                  health?.database === "postgresql"
                    ? "Connected"
                    : "Unknown"
                }
              />
            </div>

            <div className="health-row">
              <div>
                <strong>Ledger</strong>
                <span>Hash-chain integrity</span>
              </div>

              <StatusBadge
                status={
                  ledgerIntegrity
                    ? "Verified"
                    : "Failed"
                }
              />
            </div>

            <div className="health-row">
              <div>
                <strong>Mode</strong>
                <span>Backend operating mode</span>
              </div>

              <span className="health-value">
                {health?.mode || "—"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Recent Decryption Events</h3>
            <p>Real provenance events from the backend.</p>
          </div>

          <ShieldCheck size={19} />
        </div>

        {latestEvents.length === 0 ? (
          <div className="empty-inline">
            No decryption events recorded yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Document</th>
                  <th>Recipient</th>
                  <th>Session</th>
                  <th>Timestamp</th>
                </tr>
              </thead>

              <tbody>
                {latestEvents.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>#{event.id}</strong>
                    </td>

                    <td>
                      Document #{event.document_id}
                    </td>

                    <td>
                      User #{event.recipient_id}
                    </td>

                    <td>
                      <code>
                        {event.session_id?.slice(0, 16)}...
                      </code>
                    </td>

                    <td>
                      {event.timestamp
                        ? new Date(
                            event.timestamp
                          ).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;