# GroupMaker — packaged set of code that Railway knows what to do with.
# Stage 1 builds the React frontend; stage 2 runs the Flask backend and
# serves the built frontend. Students never run Docker themselves.

FROM node:20-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./
COPY data/ ./data/
COPY --from=frontend /build/frontend/dist ./frontend/dist
ENV PORT=8000
CMD gunicorn --bind 0.0.0.0:$PORT app:app
