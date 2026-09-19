import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

import {
  decryptDocument,
  getDocument,
  getDocumentRecipients,
  getCurrentUser,
  downloadFile,
} from "../api";

function DocumentDetails() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [recipients, setRecipients] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  const [decrypting, setDecrypting] = useState(false);
  const [decryptResult, setDecryptResult] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [doc, recipientData, me] = await Promise.all([
          getDocument(documentId),
          getDocumentRecipients(documentId),
          getCurrentUser(),
        ]);

        setDocument(doc);
        setRecipients(Array.isArray(recipientData) ? recipientData : []);
        setCurrentUser(me);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [documentId]);

  const handleDecrypt = async () => {
    if (!currentUser) {
      setError("Your authenticated user could not be loaded.");
      return;
    }

    const authorised = recipients.some(
      (recipient) => recipient.recipient_id === currentUser.id
    );
    if (!authorised) {
      setError("Your account is not an authorised recipient for this document.");
      return;
    }

    try {
      setDecrypting(true);
      setError("");
      setDecryptResult(null);
      const result = await decryptDocument(documentId);
      setDecryptResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setDecrypting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">
          Loading document...
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="page">
        <div className="error-message">
          {error || "Document not found."}
        </div>

        <button
          className="secondary-button"
          onClick={() => navigate("/documents")}
        >
          <ArrowLeft size={16} />
          Back to Documents
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={`DOCUMENT #${document.id}`}
        title={document.title}
        description={document.filename}
        action={
          <Link
            to="/documents"
            className="secondary-button"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        }
      />

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <FileText size={21} />
          </div>

          <div className="stat-content">
            <span className="stat-label">
              Sender
            </span>

            <strong className="stat-value">
              User #{document.sender_id}
            </strong>

            <span className="stat-description">
              Registered document owner
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-green">
            <ShieldCheck size={21} />
          </div>

          <div className="stat-content">
            <span className="stat-label">
              Recipients
            </span>

            <strong className="stat-value">
              {recipients.length}
            </strong>

            <span className="stat-description">
              Authorised recipients
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Document Metadata</h3>
            <p>
              Information returned by the backend.
            </p>
          </div>
        </div>

        <div className="attribution-record">
          <div className="record-row">
            <span>Document ID</span>
            <strong>#{document.id}</strong>
          </div>

          <div className="record-row">
            <span>Title</span>
            <strong>{document.title}</strong>
          </div>

          <div className="record-row">
            <span>Filename</span>
            <strong>{document.filename}</strong>
          </div>

          <div className="record-row">
            <span>Sender ID</span>
            <strong>{document.sender_id}</strong>
          </div>

          <div className="record-row">
            <span>Content Hash</span>
            <code>
              {document.original_content_hash ||
                "Not available"}
            </code>
          </div>

          <div className="record-row">
            <span>Created</span>
            <strong>
              {document.created_at
                ? new Date(
                    document.created_at
                  ).toLocaleString()
                : "—"}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Authorised Recipients</h3>
            <p>
              Recipients registered against this
              document.
            </p>
          </div>
        </div>

        {recipients.length === 0 ? (
          <div className="empty-inline">
            No recipients are registered.
          </div>
        ) : (
          <div className="recipient-grid">
            {recipients.map((recipient) => (
              <div
                className="recipient-card"
                key={recipient.recipient_id}
              >
                <div className="recipient-avatar">
                  {recipient.username
                    ?.charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>
                    {recipient.username ||
                      `User #${recipient.recipient_id}`}
                  </strong>

                  <span>
                    User #{recipient.recipient_id}
                  </span>
                </div>

                <StatusBadge
                  status={
                    recipient.has_encapsulated_key
                      ? "Ready"
                      : "Pending"
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Recipient Decryption</h3>
            <p>
              Creates a unique watermarked recipient
              copy and records the event.
            </p>
          </div>

          <FileCheck2 size={20} />
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label>Authenticated recipient</label>
            <input
              value={
                currentUser
                  ? `#${currentUser.id} — ${currentUser.username}`
                  : "Loading authenticated user..."
              }
              readOnly
            />
            <small className="field-help">
              The recipient is taken from your signed-in account. It cannot be changed from the browser.
            </small>
          </div>
        </div>

        <div className="form-actions">
          <button
            className="primary-button"
            onClick={handleDecrypt}
            disabled={
              decrypting ||
              !currentUser ||
              !recipients.some(
                (recipient) => recipient.recipient_id === currentUser.id
              )
            }
          >
            {decrypting ? (
              <>
                <LoaderCircle
                  size={17}
                  className="spin"
                />
                Creating Copy...
              </>
            ) : (
              <>
                <ShieldCheck size={17} />
                Create My Recipient Copy
              </>
            )}
          </button>
        </div>

        {decryptResult && (
          <div className="success-message">
            <CheckCircle2 size={19} />

            <div>
              <strong>
                Recipient copy created successfully.
              </strong>

              <span>
                Session:{" "}
                {decryptResult.session_id}
              </span>

              <span>
                Watermark:{" "}
                {decryptResult.watermark}
              </span>

              <span>
                Ledger block: #
                {decryptResult.ledger_block_index}
              </span>

              {decryptResult.download_url && (
                <button
                  type="button"
                  className="text-link"
                  onClick={async () => {
                    try {
                      const result = await downloadFile(decryptResult.download_url);
                      const url = URL.createObjectURL(result.blob);
                      const anchor = document.createElement("a");
                      anchor.href = url;
                      anchor.download = result.filename;
                      document.body.appendChild(anchor);
                      anchor.click();
                      anchor.remove();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      setError(err.message || "Download failed");
                    }
                  }}
                >
                  Download recipient copy
                  <Download size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default DocumentDetails;