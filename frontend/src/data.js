export const demoDocuments = [
  {
    id: "DOC-001",
    name: "financial_report.pdf",
    owner: "admin",
    type: "PDF",
    size: "2.4 MB",
    status: "Protected",
    createdAt: "Today, 10:42 AM",
    hash: "8f24c8d1...a91b"
  },
  {
    id: "DOC-002",
    name: "incident_evidence.zip",
    owner: "analyst",
    type: "ZIP",
    size: "8.1 MB",
    status: "Attributed",
    createdAt: "Today, 09:18 AM",
    hash: "a19d7e42...c821"
  },
  {
    id: "DOC-003",
    name: "network_logs.csv",
    owner: "admin",
    type: "CSV",
    size: "1.8 MB",
    status: "Protected",
    createdAt: "Yesterday, 04:27 PM",
    hash: "f8721a0c...e712"
  },
  {
    id: "DOC-004",
    name: "research_notes.docx",
    owner: "analyst",
    type: "DOCX",
    size: "740 KB",
    status: "Pending",
    createdAt: "Yesterday, 01:05 PM",
    hash: "b19af901...d631"
  }
];

export const demoLedger = [
  {
    index: 1,
    transaction: "GENESIS",
    document: "System initialization",
    hash: "00000000...000000",
    timestamp: "2026-09-17 09:00:00",
    status: "Verified"
  },
  {
    index: 2,
    transaction: "DOCUMENT_REGISTERED",
    document: "financial_report.pdf",
    hash: "8f24c8d1...a91b",
    timestamp: "2026-09-17 10:42:15",
    status: "Verified"
  },
  {
    index: 3,
    transaction: "ATTRIBUTION_CREATED",
    document: "incident_evidence.zip",
    hash: "a19d7e42...c821",
    timestamp: "2026-09-17 11:18:42",
    status: "Verified"
  }
];