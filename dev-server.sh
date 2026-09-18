#!/bin/bash
# Avvia l'ambiente di sviluppo: server statico in HTTP e HTTPS, piu' un proxy
# TLS davanti a Supabase.
#
# L'HTTPS serve per provare dal telefono: fotocamera e service worker sono
# ammessi solo in contesto sicuro, e localhost e' esentato mentre un IP di rete
# non lo e'.
#
# Richiede uno stack Supabase gia' avviato (supabase start).
# ponytail: socat e openssl, gia' presenti sul sistema. Nessun mkcert, nessun
# reverse proxy: per un ambiente di sviluppo a uso singolo bastano.
set -euo pipefail

LAN_IP="${LAN_IP:-$(ip -4 addr show scope global | grep -oP 'inet \K[\d.]+' | head -1)}"
TLS_DIR="${TLS_DIR:-$HOME/.cache/cantiere-safe-tls}"
DOCROOT="$(cd "$(dirname "$0")" && pwd)"

genera_certificati() {
  mkdir -p "$TLS_DIR"
  echo "Genero una CA locale e un certificato per $LAN_IP..."
  openssl req -x509 -newkey rsa:2048 -nodes -keyout "$TLS_DIR/ca.key" \
    -out "$TLS_DIR/ca.crt" -days 825 -subj "/CN=CantiereSafe Dev CA" 2>/dev/null
  openssl req -newkey rsa:2048 -nodes -keyout "$TLS_DIR/server.key" \
    -out "$TLS_DIR/server.csr" -subj "/CN=$LAN_IP" 2>/dev/null
  cat > "$TLS_DIR/ext.cnf" <<EXT
subjectAltName = IP:$LAN_IP, IP:127.0.0.1, DNS:localhost
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
EXT
  openssl x509 -req -in "$TLS_DIR/server.csr" -CA "$TLS_DIR/ca.crt" \
    -CAkey "$TLS_DIR/ca.key" -CAcreateserial -out "$TLS_DIR/server.crt" \
    -days 825 -extfile "$TLS_DIR/ext.cnf" 2>/dev/null
  cat "$TLS_DIR/server.key" "$TLS_DIR/server.crt" > "$TLS_DIR/server.pem"
  chmod 600 "$TLS_DIR/server.key" "$TLS_DIR/server.pem"
}

[ -f "$TLS_DIR/server.pem" ] || genera_certificati

# La CA va servita in chiaro: il telefono non puo' fidarsi dell'HTTPS finche'
# non l'ha installata.
cp "$TLS_DIR/ca.crt" "$DOCROOT/dev-ca.crt"

pulisci() {
  echo
  echo "Arresto..."
  kill $(jobs -p) 2>/dev/null || true
}
trap pulisci EXIT INT TERM

"$DOCROOT/dev-proxy.py" 8080 >/dev/null 2>&1 &
socat OPENSSL-LISTEN:8443,cert="$TLS_DIR/server.pem",verify=0,reuseaddr,fork \
  TCP:127.0.0.1:8080 >/dev/null 2>&1 &

sleep 1
cat <<INFO

  App
    desktop   http://127.0.0.1:8080
    telefono  http://$LAN_IP:8080          (senza fotocamera ne' service worker)
              https://$LAN_IP:8443         (completo)

  Supabase e' servito sotto /api/ sulla stessa origine, non su una porta a
  parte: cosi' c'e' un solo certificato da accettare.

  Su Firefox per Android basta accettare l'avviso di sicurezza una volta:
  quel browser ignora la CA di sistema, quindi installarla non serve.
  Su Chrome, per evitare l'avviso, si puo' installare la CA:
    1. apri  http://$LAN_IP:8080/dev-ca.crt
    2. installala come Certificato CA

  Impronta della CA:
$(openssl x509 -in "$TLS_DIR/ca.crt" -noout -fingerprint -sha256 | sed 's/^/    /')

  Ctrl-C per fermare tutto.

INFO
wait
