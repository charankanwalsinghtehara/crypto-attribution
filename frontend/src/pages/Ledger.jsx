import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";

import {
  getLedgerBlocks,
  verifyLedger,
} from "../api";

function Ledger() {
  const [blocks, setBlocks] = useState([]);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLedger = async () => {
    try {
      setLoading(true);
      setError("");

      const [blocksData, verification] =
        await Promise.all([
          getLedgerBlocks(),
          verifyLedger(),
        ]);

      setBlocks(
        Array.isArray(blocksData)
          ? blocksData
          : []
      );

      setVerified(
        verification?.ledger_integrity === true
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  return (
    <div className="page">
      <PageHeader
        eyebrow="IMMUTABLE PROVENANCE"
        title="Ledger"
        description="PostgreSQL-backed tamper-evident hash chain."
        action={
          <button
            className="secondary-button"
            onClick={loadLedger}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Verify & Refresh
          </button>
        }
      />

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            {verified ? (
              <ShieldCheck size={21} />
            ) : (
              <ShieldAlert size={21} />
            )}
          </div>

          <div className="stat-content">
            <span className="stat-label">
              Chain Integrity
            </span>

            <strong className="stat-value">
              {verified ? "Verified" : "Failed"}
            </strong>

            <span className="stat-description">
              Complete chain verification
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Database size={21} />
          </div>

          <div className="stat-content">
            <span className="stat-label">
              Ledger Blocks
            </span>

            <strong className="stat-value">
              {blocks.length}
            </strong>

            <span className="stat-description">
              Stored in PostgreSQL
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Ledger Chain</h3>
            <p>
              Actual ledger blocks returned by FastAPI.
            </p>
          </div>

          <StatusBadge
            status={
              verified ? "Verified" : "Failed"
            }
          />
        </div>

        {loading ? (
          <div className="loading-state">
            Loading ledger...
          </div>
        ) : blocks.length === 0 ? (
          <EmptyState
            title="Ledger is empty"
            description="No ledger blocks have been created yet."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Index</th>
                  <th>Previous Hash</th>
                  <th>Current Hash</th>
                  <th>Timestamp</th>
                  <th>Data</th>
                </tr>
              </thead>

              <tbody>
                {blocks.map((block) => (
                  <tr key={block.index}>
                    <td>
                      <strong>#{block.index}</strong>
                    </td>

                    <td>
                      <code>
                        {block.previous_hash?.slice(
                          0,
                          18
                        )}
                        ...
                      </code>
                    </td>

                    <td>
                      <code>
                        {block.current_hash?.slice(
                          0,
                          18
                        )}
                        ...
                      </code>
                    </td>

                    <td>
                      {block.timestamp
                        ? new Date(
                            block.timestamp
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td>
                      <span className="table-secondary">
                        {block.data_preview}
                      </span>
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

export default Ledger;