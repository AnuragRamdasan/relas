#!/bin/bash

# Hetzner VPS Setup Script for Relationship Assistant
# Run this script as root on your Hetzner VPS

set -e

echo "🚀 Setting up Hetzner VPS for Relationship Assistant..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo "🛠️ Installing essential packages..."
apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    nano \
    certbot

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose (standalone)
echo "📦 Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Create application user
echo "👤 Creating application user..."
useradd -m -s /bin/bash relas
usermod -aG docker relas

# Set up firewall
echo "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure fail2ban
echo "🔒 Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /home/relas/app
chown -R relas:relas /home/relas/app

# Create log directory
mkdir -p /var/log/relas
chown -R relas:relas /var/log/relas

# Setup log rotation
cat > /etc/logrotate.d/relas << EOF
/var/log/relas/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 relas relas
    postrotate
        docker-compose -f /home/relas/app/docker-compose.yml restart app
    endscript
}
EOF

# Create systemd service for Docker Compose
echo "⚙️ Creating systemd service..."
cat > /etc/systemd/system/relas.service << EOF
[Unit]
Description=Relationship Assistant Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/relas/app
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0
User=relas
Group=relas

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable relas.service

echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Switch to the relas user: sudo su - relas"
echo "2. Clone your repository to /home/relas/app"
echo "3. Configure environment variables"
echo "4. Run the deployment script"
echo ""
echo "🔑 Don't forget to:"
echo "- Set up your domain DNS to point to this server"
echo "- Configure your environment variables"
echo "- Set up SSL certificates with Let's Encrypt"