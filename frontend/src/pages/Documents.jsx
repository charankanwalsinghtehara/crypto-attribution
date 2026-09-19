import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Download,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import {
  getDocuments,
  getDocumentRecipients,
  downloadFile,
} from "../api";

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    if (!query) return documents;

    return documents.filter((doc) => {
      return (
        String(doc.id).includes(query) ||
        doc.title?.toLowerCase().includes(query) ||
        doc.filename?.toLowerCase().includes(query) ||
        String(doc.sender_id).includes(query)
      );
    });
  }, [documents, searchTerm]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="DOCUMENT MANAGEMENT"
        title="Documents"
        description="Documents stored by the PostgreSQL-backed attribution system."
        action={
          <Link to="/documents/upload" className="primary-button">
            Upload Document
          </Link>
        }
      />

      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={loadDocuments}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            Loading documents from backend...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            title="No documents found"
            description="There are no documents matching your search."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Document</th>
                  <th>Sender</th>
                  <th>Hash</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDocuments.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DocumentRow({ document }) {
  const [recipients, setRecipients] = useState([]);

  useEffect(() => {
    getDocumentRecipients(document.id)
      .then(setRecipients)
      .catch(() => setRecipients([]));
  }, [document.id]);

  return (
    <tr>
      <td>
        <strong>#{document.id}</strong>
      </td>

      <td>
        <div className="table-document">
          <div className="table-document-icon">
            <Archive size={17} />
          </div>

          <div>
            <strong>{document.title}</strong>
            <span>{document.filename}</span>
          </div>
        </div>
      </td>

      <td>
        User #{document.sender_id}
      </td>

      <td>
        <code>
          {document.original_content_hash
            ? `${document.original_content_hash.slice(0, 12)}...`
            : "N/A"}
        </code>
      </td>

      <td>
        {document.created_at
          ? new Date(document.created_at).toLocaleString()
          : "—"}
      </td>

      <td>
        <div className="table-actions">
          <Link
            to={`/documents/${document.id}`}
            className="icon-button"
            title="View document"
          >
            <Eye size={16} />
          </Link>

          <button
            type="button"
            className="icon-button"
            title="Download source file"
            onClick={async () => {
              try {
                const result = await downloadFile(`/documents/${document.id}/source`);
                const url = URL.createObjectURL(result.blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = result.filename;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                URL.revokeObjectURL(url);
              } catch (err) {
                window.alert(err.message || "Download failed");
              }
            }}
          >
            <Download size={16} />
          </button>
        </div>

        {recipients.length > 0 && (
          <div className="recipient-mini">
            <ShieldCheck size={13} />
            {recipients.length} recipient
            {recipients.length !== 1 ? "s" : ""}
          </div>
        )}
      </td>
    </tr>
  );
}

export default Documents;