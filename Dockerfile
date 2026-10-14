FROM nginx:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-health-timestamp.sh /docker-entrypoint.d/40-health-timestamp.sh
RUN chmod +x /docker-entrypoint.d/40-health-timestamp.sh
COPY index.html /usr/share/nginx/html/
COPY content /usr/share/nginx/html/content
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY assets /usr/share/nginx/html/assets
COPY api/health.json /usr/share/nginx/html/api/health.json
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/api/health || exit 1
