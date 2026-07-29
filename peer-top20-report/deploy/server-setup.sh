#!/usr/bin/env bash
# Ubuntu 22.04 一键部署脚本（在服务器上以 root 运行）
# 用法: bash server-setup.sh report.example.com
set -euo pipefail

DOMAIN="${1:-}"
REPO_URL="${REPO_URL:-https://github.com/heweng001/MaoniuRP.git}"
APP_DIR="${APP_DIR:-/opt/MaoniuRP}"

if [[ -z "$DOMAIN" ]]; then
  echo "用法: bash server-setup.sh 你的域名"
  echo "示例: bash server-setup.sh report.maoniunet.com"
  exit 1
fi

apt update
apt install -y git curl nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin
git checkout master
git pull origin master

cd peer-top20-extension
npm ci
npm run build

cd ../peer-top20-report
npm ci --omit=dev

cat > /etc/systemd/system/peer-top20.service <<EOF
[Unit]
Description=MaoniuRP Web Application
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR/peer-top20-report
Environment=NODE_ENV=production
Environment=PORT=3456
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable peer-top20
systemctl restart peer-top20

cat > /etc/nginx/sites-available/maoniurp <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3456;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/maoniurp /etc/nginx/sites-enabled/maoniurp
nginx -t
systemctl reload nginx

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || true

echo ""
echo "部署完成。"
echo "访问: https://$DOMAIN"
echo "默认管理员: admin / maoniu@9527  （请登录后立即修改密码）"
