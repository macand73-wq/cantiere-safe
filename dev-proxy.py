#!/usr/bin/env python3
"""Server di sviluppo: file statici piu' Supabase sotto /api/.

Serve tutto da una sola origine, cosi' il browser ha un solo certificato da
accettare. Con l'API su una porta separata l'origine e' diversa, e un
certificato non fidato li' fa fallire ogni fetch senza alcun avviso: e'
esattamente il caso di Firefox su Android, che ignora la CA di sistema.

ponytail: http.server della stdlib piu' urllib, gia' presenti. Nessun reverse
proxy da installare per un ambiente di sviluppo a uso singolo.
"""
import http.server
import socketserver
import urllib.request
import urllib.error
import sys

BACKEND = 'http://127.0.0.1:54321'
PREFIX = '/api/'
# Hop-by-hop: non vanno inoltrati (RFC 7230 6.1).
SALTA = {'connection', 'keep-alive', 'transfer-encoding', 'upgrade',
         'proxy-authenticate', 'proxy-authorization', 'te', 'trailer'}


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def _proxy(self):
        url = BACKEND + self.path[len(PREFIX) - 1:]
        lunghezza = int(self.headers.get('Content-Length') or 0)
        corpo = self.rfile.read(lunghezza) if lunghezza else None

        intestazioni = {k: v for k, v in self.headers.items()
                        if k.lower() not in SALTA and k.lower() != 'host'}
        req = urllib.request.Request(url, data=corpo, headers=intestazioni,
                                     method=self.command)
        try:
            with urllib.request.urlopen(req) as res:
                self._rispondi(res.status, res.headers, res.read())
        except urllib.error.HTTPError as e:
            # Gli errori del backend sono risposte valide: 400 e 403 sono
            # comportamento normale dell'API, non guasti del proxy.
            self._rispondi(e.code, e.headers, e.read())
        except Exception as e:
            print(f'proxy: {self.command} {url}: {e}', file=sys.stderr)
            self.send_error(502, 'Backend non raggiungibile')

    def _rispondi(self, stato, intestazioni, corpo):
        self.send_response(stato)
        for k, v in intestazioni.items():
            if k.lower() not in SALTA and k.lower() != 'content-length':
                self.send_header(k, v)
        self.send_header('Content-Length', str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def end_headers(self):
        # In sviluppo il browser non deve mai servire una copia vecchia: senza
        # questo serve un "hard reload", che su telefono non esiste come gesto.
        if not self.path.startswith(PREFIX):
            self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith(PREFIX):
            return self._proxy()
        return super().do_GET()

    def do_HEAD(self):
        if self.path.startswith(PREFIX):
            return self._proxy()
        return super().do_HEAD()

    def do_POST(self):
        return self._proxy() if self.path.startswith(PREFIX) else self.send_error(405)

    def do_PATCH(self):
        return self._proxy() if self.path.startswith(PREFIX) else self.send_error(405)

    def do_DELETE(self):
        return self._proxy() if self.path.startswith(PREFIX) else self.send_error(405)

    def do_PUT(self):
        return self._proxy() if self.path.startswith(PREFIX) else self.send_error(405)

    def do_OPTIONS(self):
        return self._proxy() if self.path.startswith(PREFIX) else self.send_error(405)

    def log_message(self, fmt, *args):
        print(f'{self.address_string()} {fmt % args}', file=sys.stderr)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    with Server(('0.0.0.0', porta), Handler) as httpd:
        print(f'statico + /api/ -> {BACKEND} su :{porta}', file=sys.stderr)
        httpd.serve_forever()
