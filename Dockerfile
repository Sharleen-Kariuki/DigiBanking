# DigiBanking Onboarding API Linux Container
FROM ubuntu:22.04

# Install runtime dependencies for glibc and SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy application files
COPY config.xml /app/config.xml
COPY data/ /app/data/
COPY api/ /app/api/

# Set executable permissions on binary and launch script
RUN chmod +x /app/api/run.sh /app/api/onboarding-api

# Default environment configuration
ENV PORT=3000
ENV DB_PATH=/app/data/onboarding.sqlite
ENV CONFIG_PATH=/app/config.xml

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD [ "sh", "-c", "exec 3<>/dev/tcp/127.0.0.1/${PORT:-3000} && echo -e 'GET /health HTTP/1.1\\r\\nHost: localhost\\r\\nConnection: close\\r\\n\\r\\n' >&3 && head -n 1 <&3 | grep -q '200 OK'" ] || exit 1

ENTRYPOINT ["/app/api/run.sh"]
