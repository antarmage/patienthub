import base64
import io
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import pymupdf
from PIL import Image

from gateway import create_app


def data_url(content, mime):
    return f"data:{mime};base64,{base64.b64encode(content).decode()}"


def image_bytes():
    output = io.BytesIO()
    Image.new("RGB", (20, 20), color="white").save(output, "PNG")
    return output.getvalue()


def pdf_bytes(pages):
    with pymupdf.open() as document:
        for _ in range(pages):
            page = document.new_page()
            page.insert_text((50, 50), "Synthetic test document")
        return document.tobytes()


class FakeParser:
    def __init__(self):
        self.calls = []
        self.fail_page = None

    def parse(self, image, **kwargs):
        self.calls.append(image)
        if self.fail_page == len(self.calls):
            raise RuntimeError("Internal sensitive details")
        return SimpleNamespace(markdown_result=f"Synthetic page {len(self.calls)}")


class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {"GLM_OCR_API_KEY": "test-key"})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.parser = FakeParser()
        self.client = create_app(self.parser).test_client()

    def post(self, content, mime="image/png", headers=None):
        return self.client.post(
            "/glmocr/parse",
            json={"file": data_url(content, mime)},
            headers=headers if headers is not None else {"Authorization": "Bearer test-key"},
        )

    def test_requires_authentication_and_does_not_accept_urls(self):
        self.assertEqual(self.post(image_bytes(), headers={}).status_code, 401)
        response = self.client.post("/glmocr/parse", json={"file": "https://example.com/patient.pdf"}, headers={"Authorization": "Bearer test-key"})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.parser.calls, [])

    def test_image_and_source_provenance(self):
        response = self.post(image_bytes())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["pages"], [{"pageNumber": 1, "text": "Synthetic page 1"}])
        self.assertIn("Source page 1", response.json["markdown_result"])

    def test_pdf_renders_every_page_and_preserves_order(self):
        response = self.post(pdf_bytes(2), "application/pdf")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([page["pageNumber"] for page in response.json["pages"]], [1, 2])
        self.assertEqual(len(self.parser.calls), 2)

    def test_rejects_over_limit_pdf_instead_of_truncating(self):
        response = self.post(pdf_bytes(11), "application/pdf")
        self.assertEqual(response.status_code, 422)
        self.assertIn("between 1 and 10", response.json["error"])
        self.assertEqual(self.parser.calls, [])

    def test_exact_page_limit_is_accepted(self):
        self.assertEqual(self.post(pdf_bytes(10), "application/pdf").status_code, 200)
        self.assertEqual(len(self.parser.calls), 10)

    def test_encrypted_pdf_is_rejected_before_inference(self):
        with pymupdf.open(stream=pdf_bytes(1), filetype="pdf") as document:
            encrypted = document.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw="synthetic-owner", user_pw="synthetic-user")
        self.assertEqual(self.post(encrypted, "application/pdf").status_code, 422)
        self.assertEqual(self.parser.calls, [])

    def test_blank_page_is_not_returned_as_a_successful_read(self):
        self.parser.parse = lambda *_args, **_kwargs: SimpleNamespace(markdown_result=" ")
        response = self.post(image_bytes())
        self.assertEqual(response.status_code, 422)
        self.assertNotIn("pages", response.json)

    def test_failed_page_never_returns_partial_success_or_sensitive_exception(self):
        self.parser.fail_page = 2
        response = self.post(pdf_bytes(2), "application/pdf")
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("pages", response.json)
        self.assertNotIn("sensitive", response.json["error"])
        self.assertEqual(self.post(image_bytes()).status_code, 200)

    def test_corrupt_files_and_empty_base64_are_rejected(self):
        for content, mime in [(b"", "image/png"), (b"not an image", "image/png"), (b"not a pdf", "application/pdf")]:
            self.assertEqual(self.post(content, mime).status_code, 422)
        self.assertEqual(self.parser.calls, [])

    def test_missing_service_secret_blocks_startup(self):
        with patch.dict(os.environ, {"GLM_OCR_API_KEY": ""}):
            with self.assertRaises(RuntimeError):
                create_app(self.parser)

    def test_health_is_available_without_sending_a_document(self):
        self.assertEqual(self.client.get("/health").json, {"status": "ok"})
        self.assertEqual(self.parser.calls, [])


if __name__ == "__main__":
    unittest.main()
