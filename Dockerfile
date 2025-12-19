# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy the entire project
COPY . /app/.

# Install Python dependencies
RUN cd backend && pip install --no-cache-dir -r requirements.txt

# Change to backend directory
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Start command
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
