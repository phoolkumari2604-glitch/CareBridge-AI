import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Upload,
  X,
  Trash2,
  Download,
  Eye,
  File,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink
} from "lucide-react";
import doctorService from "../../services/doctorService";
import "./PatientDocumentsModal.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export default function PatientDocumentsModal({
  isOpen,
  onClose,
  patient,
  onDocumentAdded,
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const patientId = patient?.id || patient?._id;

  const loadDocuments = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const records = await doctorService.getPatientDocuments(patientId);
      // Filter records that have attachments or are of document types
      const docs = (Array.isArray(records) ? records : []).filter(
        (r) =>
          r.file_url ||
          (Array.isArray(r.attachments) && r.attachments.length > 0) ||
          r.record_type === "DIAGNOSTIC_REPORT" ||
          r.record_type === "LAB_REPORT" ||
          r.record_type === "PRESCRIPTION"
      );
      setDocuments(docs);
    } catch (err) {
      console.warn("Failed to load patient documents:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (isOpen && patientId) {
      loadDocuments();
    }
  }, [isOpen, patientId, loadDocuments]);

  if (!isOpen) return null;

  const handleFileSelect = async (files) => {
    if (!files || !files.length) return;
    setErrorMsg("");

    const file = files[0];
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit.`);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp|docx?)$/i)) {
      setErrorMsg("Invalid file format. Please upload PDF, JPG, PNG, WebP, or DOCX files.");
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 15 : p));
      }, 150);

      const res = await doctorService.uploadPatientDocument(
        patientId,
        file,
        file.name,
        file.name.toLowerCase().includes("lab")
          ? "LAB_REPORT"
          : file.name.toLowerCase().includes("rx") || file.name.toLowerCase().includes("prescription")
          ? "PRESCRIPTION"
          : "DIAGNOSTIC_REPORT"
      );

      clearInterval(interval);
      setUploadProgress(100);

      showToast(`Document "${file.name}" uploaded successfully`);
      await loadDocuments();
      if (onDocumentAdded) onDocumentAdded(res);
    } catch (err) {
      console.error("Upload document failed:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (recordId) => {
    try {
      await doctorService.deletePatientDocument(recordId);
      setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== recordId));
      setDeleteConfirmId(null);
      showToast("Document deleted successfully");
    } catch (err) {
      console.error("Failed to delete document:", err);
      showToast("Failed to delete document");
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (doc.title || doc.file_name || "").toLowerCase();
    const notes = (doc.notes || "").toLowerCase();
    const type = (doc.record_type || "").toLowerCase();
    return title.includes(q) || notes.includes(q) || type.includes(q);
  });

  return (
    <div className="patient-docs-modal-overlay" onClick={onClose}>
      <div className="patient-docs-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="patient-docs-header">
          <div className="patient-docs-title-col">
            <div className="patient-docs-icon-badge">
              <FileText size={20} />
            </div>
            <div>
              <h3>Patient Clinical Documents</h3>
              <p>
                Medical reports, prescriptions, and scans for{" "}
                <strong>{patient?.name || "Patient"}</strong> (ID: #{patient?.patient_code || "100001"})
              </p>
            </div>
          </div>
          <button type="button" className="patient-docs-close-btn" onClick={onClose} title="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Toast & Error messages */}
        {toastMsg && (
          <div className="patient-docs-toast">
            <CheckCircle2 size={15} />
            <span>{toastMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="patient-docs-error">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Upload Zone */}
        <div
          className="patient-docs-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileSelect(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <div className="dropzone-content">
            <div className="dropzone-icon-wrap">
              <Upload size={22} />
            </div>
            <div className="dropzone-text">
              <strong>Click or drag &amp; drop to upload documents</strong>
              <span>PDF, JPG, PNG, WebP, or DOCX (Max 10 MB per file)</span>
            </div>
          </div>
          {uploading && (
            <div className="upload-progress-strip">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>

        {/* Search & Counter Bar */}
        <div className="patient-docs-search-bar">
          <div className="docs-search-wrap">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search documents by title, type, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search" onClick={() => setSearchQuery("")}>
                <X size={12} />
              </button>
            )}
          </div>
          <span className="docs-count-pill">
            {filteredDocuments.length} document{filteredDocuments.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Documents List */}
        <div className="patient-docs-list-scroll">
          {loading ? (
            <div className="docs-loading-state">
              <RefreshCw size={24} className="spin-icon" />
              <span>Loading documents repository...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="docs-empty-state">
              <FileText size={36} opacity={0.3} />
              <p>
                {searchQuery
                  ? "No documents match your search criteria."
                  : "No documents uploaded for this patient yet."}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const docId = doc._id || doc.id;
              const fileUrl = doc.file_url || doc.attachments?.[0]?.url || "";
              const fileName = doc.file_name || doc.title || doc.attachments?.[0]?.name || "Medical Document";
              const isImage = fileName.match(/\.(jpe?g|png|webp)$/i) || doc.attachments?.[0]?.type?.includes("image");
              const createdDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }) : "Recent";

              return (
                <div key={docId} className="patient-doc-item">
                  <div className="doc-icon-col">
                    {isImage ? <ImageIcon size={20} color="#0284c7" /> : <File size={20} color="#10b981" />}
                  </div>

                  <div className="doc-info-col">
                    <strong>{fileName}</strong>
                    <div className="doc-meta-row">
                      <span className="doc-type-tag">{doc.record_type || "DIAGNOSTIC_REPORT"}</span>
                      <span>·</span>
                      <span>{createdDate}</span>
                      {doc.file_size && (
                        <>
                          <span>·</span>
                          <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="doc-actions-col">
                    {fileUrl && (
                      <>
                        <button
                          type="button"
                          className="doc-action-btn"
                          title="Preview Document"
                          onClick={() => setPreviewDoc({ name: fileName, url: fileUrl, isImage })}
                        >
                          <Eye size={15} />
                        </button>
                        <a
                          href={fileUrl}
                          download={fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="doc-action-btn"
                          title="Download Document"
                        >
                          <Download size={15} />
                        </a>
                      </>
                    )}

                    {deleteConfirmId === docId ? (
                      <div className="delete-confirm-group">
                        <button
                          type="button"
                          className="delete-btn confirm"
                          onClick={() => handleDelete(docId)}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="delete-btn cancel"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="doc-action-btn danger"
                        title="Delete Document"
                        onClick={() => setDeleteConfirmId(docId)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Document Preview Modal */}
        {previewDoc && (
          <div className="doc-preview-modal-overlay" onClick={() => setPreviewDoc(null)}>
            <div className="doc-preview-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="preview-header">
                <strong>{previewDoc.name}</strong>
                <button type="button" onClick={() => setPreviewDoc(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="preview-body">
                {previewDoc.isImage ? (
                  <img src={previewDoc.url} alt={previewDoc.name} className="preview-image" />
                ) : (
                  <iframe src={previewDoc.url} title={previewDoc.name} className="preview-iframe" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="patient-docs-footer">
          <button type="button" className="patient-docs-close-action" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
