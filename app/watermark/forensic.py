"""
Invisible forensic watermark generation & extraction.

At decryption time a unique token is generated and embedded so that:
- The document looks identical to the naked eye
- The token can later be extracted from a leaked copy
- The token is bound to the recipient + session via the signed ledger entry
"""

from __future__ import annotations
import uuid
import hashlib
import os
from pathlib import Path
from typing import Optional

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from io import BytesIO


def generate_session_watermark(recipient_id: int, document_id: int) -> str:
    """
    Cryptographically unique token for this exact decryption session.
    Uses SHA3-256 of (recipient || document || uuid || random).
    """
    raw = (
        f"{recipient_id}:"
        f"{document_id}:"
        f"{uuid.uuid4().hex}:"
        f"{os.urandom(16).hex()}"
    )
    return hashlib.sha3_256(raw.encode("utf-8")).hexdigest()[:40]


def embed_invisible_watermark(
    input_path: str,
    output_path: str,
    watermark_token: str,
) -> None:
    """
    Embed the forensic token into a PDF so it is:
    - Invisible under normal viewing
    - Recoverable later via extract_watermark()
    """
    input_path = str(input_path)
    output_path = str(output_path)

    # Ensure parent dir exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # If the source is not a PDF we just copy + write a sidecar marker
    if not input_path.lower().endswith(".pdf"):
        import shutil
        shutil.copy2(input_path, output_path)
        # Write a small companion file that holds the watermark
        with open(output_path + ".wm", "w") as f:
            f.write(watermark_token)
        return

    reader = PdfReader(input_path)
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    # 1. Store in document metadata (invisible to most PDF viewers)
    writer.add_metadata({
        "/ForensicWatermark": watermark_token,
        "/Producer": "CryptoAttribution-Offline-PQ",
        "/Creator": "Hackathon-Immutable-Provenance",
    })

    # 2. Add a nearly invisible text layer (white 1-pt font)
    packet = BytesIO()
    can = canvas.Canvas(packet, pagesize=letter)
    can.setFillColorRGB(1, 1, 1)  # pure white
    can.setFont("Helvetica", 0.5)
    can.drawString(0.5, 0.5, f"WM:{watermark_token}")
    can.save()
    packet.seek(0)

    try:
        wm_pdf = PdfReader(packet)
        if len(writer.pages) > 0 and len(wm_pdf.pages) > 0:
            writer.pages[0].merge_page(wm_pdf.pages[0])
    except Exception:
        pass  # metadata is still present

    with open(output_path, "wb") as f:
        writer.write(f)


def extract_watermark(leaked_path: str) -> Optional[str]:
    """
    Extract the forensic watermark from a (possibly leaked) document.
    Returns the token string or None if not found.
    """
    leaked_path = str(leaked_path)

    # Companion file (non-PDF case)
    if os.path.exists(leaked_path + ".wm"):
        with open(leaked_path + ".wm", "r") as f:
            return f.read().strip()

    if not leaked_path.lower().endswith(".pdf"):
        return None

    try:
        reader = PdfReader(leaked_path)
        meta = reader.metadata
        if meta:
            # pypdf normalises keys
            for key in ("/ForensicWatermark", "ForensicWatermark"):
                if key in meta and meta[key]:
                    return str(meta[key]).strip()
            # Sometimes keys lose the leading slash
            for k, v in meta.items():
                if "ForensicWatermark" in str(k) and v:
                    return str(v).strip()
    except Exception:
        pass

    return None
