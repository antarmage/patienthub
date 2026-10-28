FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY gateway.py config.yaml ./
RUN useradd --uid 10001 --create-home ocr && mkdir /models && chown ocr:ocr /models
USER ocr
EXPOSE 5002
CMD ["gunicorn", "--bind", "0.0.0.0:5002", "--workers", "1", "--threads", "2", "--timeout", "330", "gateway:create_app()"]
