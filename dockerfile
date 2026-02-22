FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install basics
RUN apt-get update && apt-get install -y \
    curl \
    make \
    build-essential \
    && rm -rf /var/lib/apt/lists/*


RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

RUN cd frontend && npm install
RUN cd backend && npm install

COPY . .

# Expose ports
EXPOSE 3000 5000

CMD ["tail", "-f", "/dev/null"]