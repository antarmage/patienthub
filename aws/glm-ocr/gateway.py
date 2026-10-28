import atexit
import base64
import binascii
import hmac
import io
import os
import threading

import pymupdf
from flask import Flask, jsonify, request
from PIL import Image, UnidentifiedImageError

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_PAGES = 10
MAX_PIXELS = 20_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


class DocumentError(Exception):
    pass


def decode_file(value):
    if not isinstance(value, str) or not value.startswith("data:"):
        raise DocumentError("A base64 document data URL is required.")
    header, separator, encoded = value.partition(",")
    if not separator or header not in {
        "data:application/pdf;base64",
        "data:image/jpeg;base64",
        "data:image/png;base64",
        "data:image/webp;base64",
        "data:image/gif;base64",
    }:
        raise DocumentError("Unsupported document MIME type.")
    try:
        content = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as error:
        raise DocumentError("Invalid base64 document.") from error
    if not content or len(content) > MAX_FILE_BYTES:
        raise DocumentError("Document must be nonempty and at most 10MB.")
    return header, content


def document_pages(header, content):
    if header == "data:application/pdf;base64":
        try:
            document = pymupdf.open(stream=content, filetype="pdf")
        except (RuntimeError, ValueError) as error:
            raise DocumentError("Invalid PDF.") from error
        with document:
            if document.needs_pass:
                raise DocumentError("Password-protected PDFs are not supported.")
            if not 1 <= document.page_count <= MAX_PAGES:
                raise DocumentError("PDFs must contain between 1 and 10 pages. Split the document and retry.")
            for page in document:
                if page.rect.is_empty or page.rect.is_infinite:
                    raise DocumentError("PDF contains an invalid page.")
                scale = min(200 / 72, 3500 / max(page.rect.width, page.rect.height))
                yield page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False).tobytes("png")
        return
    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.width * image.height > MAX_PIXELS:
                raise DocumentError("Image is too large. Maximum is 20 megapixels.")
            if getattr(image, "n_frames", 1) != 1:
                raise DocumentError("Multi-frame images are not supported. Upload individual pages or a PDF.")
            output = io.BytesIO()
            image.convert("RGB").save(output, format="PNG")
            yield output.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise DocumentError("Invalid or oversized image.") from error


def create_app(parser=None):
    api_key = os.environ.get("GLM_OCR_API_KEY", "")
    if not api_key:
        raise RuntimeError("GLM_OCR_API_KEY must be configured.")
    if parser is None:
        from glmocr import GlmOcr

        parser = GlmOcr(
            config_path=os.environ.get("GLMOCR_CONFIG", "/app/config.yaml"),
            mode="selfhosted",
        )
        parser.__enter__()
        atexit.register(parser.close)

    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024
    processing = threading.Lock()

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.post("/glmocr/parse")
    def parse():
        authorization = request.headers.get("Authorization", "")
        if not hmac.compare_digest(authorization, f"Bearer {api_key}"):
            return jsonify({"error": "Unauthorized"}), 401
        if not request.is_json:
            return jsonify({"error": "Expected JSON."}), 400
        payload = request.get_json()
        if not isinstance(payload, dict):
            return jsonify({"error": "Expected a JSON object."}), 400
        if not processing.acquire(blocking=False):
            return jsonify({"error": "OCR is busy. Please retry."}), 429
        try:
            header, content = decode_file(payload.get("file"))
            pages = []
            for page_number, image in enumerate(document_pages(header, content), start=1):
                result = parser.parse(image, save_layout_visualization=False)
                text = result.markdown_result
                if not isinstance(text, str) or not text.strip():
                    raise DocumentError(f"Page {page_number} could not be read. No partial extraction was returned.")
                pages.append({"pageNumber": page_number, "text": text})
            if not pages:
                raise DocumentError("No readable pages.")
            markdown = "\n\n".join(f"## Source page {page['pageNumber']}\n\n{page['text']}" for page in pages)
            if len(markdown) > 100_000:
                raise DocumentError("Document text is too long. Split the document and retry.")
            return jsonify({"markdown_result": markdown, "pages": pages})
        except DocumentError as error:
            return jsonify({"error": str(error)}), 422
        except Exception as error:
            app.logger.error("OCR processing failed (%s).", type(error).__name__)
            return jsonify({"error": "OCR processing failed. No partial extraction was returned."}), 502
        finally:
            processing.release()

    return app
