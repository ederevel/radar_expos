# Utiliser l’image Python officielle
FROM python:3.12

# Install system dependencies
RUN apt update && apt install -y \
    cmake \
    python3-dev \
    build-essential \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libboost-all-dev \
    libjxl-dev \
    poppler-utils \
    tesseract-ocr \
    libtesseract-dev \
    tesseract-ocr-fra

# Définir le répertoire de travail
WORKDIR /app

# Copy the prebuilt `dlib` wheel from the host machine
COPY wheels /wheels

# Install `dlib` from the prebuilt wheel
RUN export DLIB_USE_CUDA=0 && pip install --no-cache-dir /wheels/dlib-19.24.6-cp312-cp312-linux_x86_64.whl

# Copier les fichiers nécessaires
COPY requirements.txt .

# Installer les dépendances
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste du projet
COPY . .

# Exposer le port de l’API
EXPOSE 8000

# Lancer l’application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
