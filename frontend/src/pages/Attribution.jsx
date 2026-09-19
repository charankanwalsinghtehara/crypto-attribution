import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileCheck2,
  FileSearch,
  Fingerprint,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { identifyLeakedDocument } from "../api";

function Attribution() {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectFile = (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setError("");
  };

  const identify = async () => {
    if (!file) {
      setError("Please select a leaked document.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const data = await identifyLeakedDocument(file);

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="FORENSIC ANALYSIS"
        title="Attribution"
        description="Upload a leaked recipient copy and identify its cryptographic provenance."
      />

      <section className="panel">
        <div
          className="upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">
            <FileSearch size={28} />
          </div>

          <h3>
            {file
              ? file.name
              : "Select leaked document"}
          </h3>

          <p>
            {file
              ? "Ready for forensic analysis"
              : "Upload a watermarked recipient copy"}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(event) =>
              selectFile(event.target.files?.[0])
            }
          />
        </div>

        <div className="form-actions">
          <button
            className="primary-button"
            onClick={identify}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <LoaderCircle
                  size={17}
                  className="spin"
                />
                Analysing...
              </>
            ) : (
              <>
                <Fingerprint size={17} />
                Identify Attribution
              </>
            )}
          </button>
        </div>
      </section>

      {error && (
        <div className="error-message">
          <ShieldAlert size={18} />
          {error}
        </div>
      )}

      {result && (
        <>
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <CheckCircle2 size={21} />
              </div>

              <div className="stat-content">
                <span className="stat-label">
                  Recipient
                </span>

                <strong className="stat-value">
                  {result.username}
                </strong>

                <span className="stat-description">
                  User #{result.identified_recipient_id}
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-purple">
                <Fingerprint size={21} />
              </div>

              <div className="stat-content">
                <span className="stat-label">
                  Signature
                </span>

                <strong className="stat-value">
                  {result.signature_valid
                    ? "Valid"
                    : "Invalid"}
                </strong>

                <span className="stat-description">
                  Cryptographic verification
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-blue">
                <ShieldCheck size={21} />
              </div>

              <div className="stat-content">
                <span className="stat-label">
                  Ledger
                </span>

                <strong className="stat-value">
                  {result.ledger_integrity
                    ? "Intact"
                    : "Broken"}
                </strong>

                <span className="stat-description">
                  Hash-chain verification
                </span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Forensic Attribution Result</h3>
                <p>
                  Cryptographically recovered provenance
                  record.
                </p>
              </div>

              <StatusBadge
                status={
                  result.signature_valid &&
                  result.ledger_integrity
                    ? "Verified"
                    : "Review"
                }
              />
            </div>

            <div className="attribution-record">
              <div className="record-row">
                <span>Recipient</span>
                <strong>
                  {result.username} (#
                  {result.identified_recipient_id})
                </strong>
              </div>

              <div className="record-row">
                <span>Session ID</span>
                <code>{result.session_id}</code>
              </div>

              <div className="record-row">
                <span>Watermark</span>
                <code>{result.watermark}</code>
              </div>

              <div className="record-row">
                <span>Signature</span>
                <StatusBadge
                  status={
                    result.signature_valid
                      ? "Verified"
                      : "Invalid"
                  }
                />
              </div>

              <div className="record-row">
                <span>Ledger Integrity</span>
                <StatusBadge
                  status={
                    result.ledger_integrity
                      ? "Verified"
                      : "Failed"
                  }
                />
              </div>

              <div className="record-row">
                <span>Decryption Time</span>
                <strong>
                  {result.decryption_time
                    ? new Date(
                        result.decryption_time
                      ).toLocaleString()
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="success-message">
              <FileCheck2 size={19} />

              <div>
                <strong>
                  Attribution analysis completed
                </strong>

                <span>
                  {result.message}
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Attribution;