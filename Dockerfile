# PES 2021 Option Studio on Google Cloud Run
# Cloud Run sets PORT and K_SERVICE; server.py then listens on 0.0.0.0 and never serves data/.
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 HOST=0.0.0.0
WORKDIR /app
# everything except what .dockerignore leaves out; server.py only serves index.html, js/, vendor/, assets/
COPY . .
RUN useradd --system --no-create-home studio
USER studio
CMD ["python", "server.py"]
