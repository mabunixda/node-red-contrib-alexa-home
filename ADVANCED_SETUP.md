# Advanced Setup Guide

This document covers advanced configuration methods for `node-red-contrib-alexa-home` that require system-level changes or environment variable configuration.

## 🚨 Alexa Generation 3+ Port Requirements

Modern Alexa devices require communication on standard ports:
- **Port 80** for HTTP communication
- **Port 443** for HTTPS communication

If you cannot configure these ports directly in the Node-RED interface, use one of the methods below.

## Method 1: Environment Variables

Set environment variables to configure the Alexa Home Controller before starting Node-RED.

### Basic Port Configuration

```bash
# Set port to 80 for HTTP
export ALEXA_PORT=80

# Start Node-RED (may require sudo for port 80)
sudo node-red
```

**⚠️ Linux Permissions Note**: Ports 80 and 443 are privileged ports on Linux systems and require special permissions. See the [Permission Issues](#permission-issues) section below for secure configuration methods.

### Systemd Service Configuration

For Node-RED running as a systemd service, add environment variables to the service file:

```ini
[Service]
Environment=ALEXA_PORT=80
# ... other service configuration
```

### HTTPS/TLS Environment Configuration

Configure HTTPS using environment variables:

```bash
export ALEXA_HTTPS=true
export ALEXA_PORT=443
export ALEXA_CERT_PATH=/path/to/your/cert.pem
export ALEXA_KEY_PATH=/path/to/your/private.key
export ALEXA_CA_PATH=/path/to/ca-bundle.pem  # Optional
```

**Environment Variables Reference:**

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ALEXA_PORT` | Web server port | `60000` | `80` |
| `ALEXA_HTTPS` | Enable HTTPS mode | `false` | `true` |
| `ALEXA_CERT_PATH` | SSL certificate file path | - | `/etc/ssl/cert.pem` |
| `ALEXA_KEY_PATH` | SSL private key file path | - | `/etc/ssl/private.key` |
| `ALEXA_CA_PATH` | Certificate Authority bundle | - | `/etc/ssl/ca-bundle.pem` |

## Method 2: Port Forwarding with iptables

Redirect traffic from standard ports to your configured Node-RED port without changing the application configuration.

### HTTP Port Forwarding

```bash
# Forward port 80 to Node-RED port (e.g., 60000)
sudo iptables -t nat -I PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 60000

# View current rules
sudo iptables -t nat -L PREROUTING -n --line-numbers
```

### HTTPS Port Forwarding

```bash
# Forward port 443 to Node-RED port
sudo iptables -t nat -I PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 60000
```

### Making iptables Rules Persistent

#### Ubuntu/Debian

```bash
# Install iptables-persistent
sudo apt-get install iptables-persistent

# Save current rules
sudo iptables-save > /etc/iptables/rules.v4
sudo ip6tables-save > /etc/iptables/rules.v6

# Or use the netfilter-persistent command
sudo netfilter-persistent save
```

#### CentOS/RHEL/Fedora

```bash
# Save current rules
sudo iptables-save > /etc/sysconfig/iptables

# Enable iptables service
sudo systemctl enable iptables
```

#### Manual Persistence

Add the iptables commands to your system startup scripts:

```bash
# Add to /etc/rc.local (before exit 0)
iptables -t nat -I PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 60000
```

### Removing iptables Rules

```bash
# List rules with line numbers
sudo iptables -t nat -L PREROUTING -n --line-numbers

# Remove specific rule (replace X with line number)
sudo iptables -t nat -D PREROUTING X

# Or remove by specification
sudo iptables -t nat -D PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 60000
```

## Method 3: Reverse Proxy (nginx/Apache)

Use a reverse proxy to handle port 80/443 and forward to Node-RED.

### nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.local;

    location / {
        proxy_pass http://localhost:60000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Apache Configuration

```apache
<VirtualHost *:80>
    ServerName your-domain.local
    ProxyPreserveHost On
    ProxyPass / http://localhost:60000/
    ProxyPassReverse / http://localhost:60000/
</VirtualHost>
```

## Security Considerations

### File Permissions for SSL Certificates

```bash
# Set proper permissions for certificate files
sudo chmod 644 /path/to/cert.pem
sudo chmod 600 /path/to/private.key
sudo chown node-red:node-red /path/to/cert.pem /path/to/private.key
```

### Firewall Configuration

Ensure your firewall allows traffic on the configured ports:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

### Permission Issues

On Linux systems, ports below 1024 (including 80 and 443) are considered "privileged ports" and require special permissions to bind to them.

#### Understanding Privileged Ports

If you get permission errors when binding to ports 80 or 443:

```bash
Error: listen EACCES: permission denied 0.0.0.0:80
```

This happens because:
- **Ports 1-1023** are reserved for system services
- **Only root user** can bind to these ports by default
- **Security measure** to prevent unauthorized services from hijacking important ports

#### Solution Options (in order of preference)

**Option 1: Grant Node.js Capability to Bind Privileged Ports (Recommended)**

Give Node.js permission to bind to privileged ports without running as root:

```bash
# Find Node.js binary location
which node
# Output: /usr/bin/node (or /usr/local/bin/node)

# Grant capability to bind to privileged ports
sudo setcap 'cap_net_bind_service=+ep' /usr/bin/node

# Verify capability was set
getcap /usr/bin/node
# Output: /usr/bin/node = cap_net_bind_service+ep
```

**Benefits:**
- ✅ Secure - Node-RED doesn't run as root
- ✅ Persistent across reboots
- ✅ Only grants specific network capability
- ✅ Works with systemd services

**Option 2: Use Port Forwarding (Most Secure)**

Redirect privileged ports to unprivileged ports using iptables:

```bash
# Forward port 80 to Node-RED running on port 60000
sudo iptables -t nat -I PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 60000
sudo iptables -t nat -I PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 60001
```

**Benefits:**
- ✅ Most secure approach
- ✅ Node-RED runs as regular user
- ✅ No special capabilities needed
- ✅ Can use any high port numbers

**Option 3: Run as Root (Not Recommended for Production)**

```bash
# Direct execution (testing only)
sudo node-red

# Systemd service as root
sudo systemctl edit node-red
# Add: User=root
```

**Drawbacks:**
- ❌ Security risk - entire Node-RED runs as root
- ❌ Potential for system damage if compromised
- ❌ Against security best practices

#### Systemd Service Configuration

For Node-RED running as a systemd service with privileged ports:

```bash
# Edit the service file
sudo systemctl edit node-red

# Add environment and capability settings
[Service]
Environment=ALEXA_PORT=80
# Ensure Node.js has the required capability
ExecStartPre=/bin/bash -c 'setcap cap_net_bind_service=+ep $(which node)'

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart node-red
```

#### Verification

Check if Node-RED is successfully binding to the privileged port:

```bash
# Check if port is bound
sudo netstat -tlnp | grep :80
# Expected: tcp6  0  0  :::80  :::*  LISTEN  <pid>/node

# Test connectivity
curl -I http://localhost:80/description.xml
# Expected: HTTP/1.1 200 OK

# Check Node-RED logs
sudo journalctl -u node-red -f
```

### Service Management

Managing Node-RED with environment variables in systemd:

```bash
# Edit service file
sudo systemctl edit node-red

# Add environment variables in override file
[Service]
Environment=ALEXA_PORT=80
Environment=ALEXA_HTTPS=false

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart node-red
```

### Debugging Network Issues

```bash
# Check if port is being used
sudo netstat -tlnp | grep :80

# Test connectivity
curl -I http://localhost:80/description.xml

# Monitor iptables traffic
sudo iptables -t nat -L PREROUTING -v
```

## Best Practices

1. **Use HTTPS in Production**: Always use SSL/TLS certificates for production deployments
2. **Avoid Running as Root**: Use port forwarding or reverse proxy instead of running Node-RED as root
3. **Monitor Logs**: Keep an eye on Node-RED and system logs for issues
4. **Backup Configurations**: Save your iptables rules and certificate configurations
5. **Regular Updates**: Keep SSL certificates updated and monitor expiration dates

## References

- [iptables Documentation](https://netfilter.org/documentation/)
- [nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Node-RED Security Guidelines](https://nodered.org/docs/user-guide/runtime/securing-node-red)
- [Let's Encrypt SSL Certificates](https://letsencrypt.org/)
