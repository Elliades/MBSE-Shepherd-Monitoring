FROM nginx:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-health-timestamp.sh /docker-entrypoint.d/40-health-timestamp.sh
RUN chmod +x /docker-entrypoint.d/40-health-timestamp.sh
COPY index.html /usr/share/nginx/html/
COPY home /usr/share/nginx/html/home
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY assets /usr/share/nginx/html/assets
COPY part1 /usr/share/nginx/html/part1
COPY part2 /usr/share/nginx/html/part2
COPY part3 /usr/share/nginx/html/part3
# Part 4 with the 3D drone of its lab, not the lab itself (part4/lab/, a proof of concept not published yet)
COPY part4/index.html /usr/share/nginx/html/part4/
COPY part4/content /usr/share/nginx/html/part4/content
COPY part4/assets /usr/share/nginx/html/part4/assets
COPY part4/lab/catalog.js part4/lab/drone3d.js part4/lab/drone3d.css /usr/share/nginx/html/part4/lab/
COPY diag /usr/share/nginx/html/diag
COPY bridge /usr/share/nginx/html/bridge
COPY monitor /usr/share/nginx/html/monitor
COPY tool /usr/share/nginx/html/tool
COPY promo /usr/share/nginx/html/promo
COPY api/health.json /usr/share/nginx/html/api/health.json
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/api/health || exit 1
