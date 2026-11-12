#!/usr/bin/env python3
"""Start the complete, self-hosted StreamHouse frontend using Python's stdlib."""
from __future__ import annotations
import argparse
import hashlib
import http.server
import io
import threading
from pathlib import Path
import webbrowser
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def restore_media_if_missing() -> None:
    required = [
        ROOT / 'assets/emerald-d20-albedo.webp',
        ROOT / 'rozgrywka/assets/premium-webgl.js',
        ROOT / 'rozgrywka/assets/premium-atlases.js',
        ROOT / 'rozgrywka/assets/malachite-source.webp',
    ]
    if all(path.is_file() for path in required):
        return
    parts = sorted((ROOT / 'bundles').glob('media.part[0-9][0-9][0-9]'))
    expected_path = ROOT / 'bundles/media.sha256'
    if not parts or not expected_path.is_file():
        raise RuntimeError('Brakuje tekstur. Pobierz PELNA paczke v11 lub odtworz zasoby z bundles/media.part*.')
    data = b''.join(p.read_bytes() for p in parts)
    actual = hashlib.sha256(data).hexdigest()
    expected = expected_path.read_text(encoding='utf-8').strip().split()[0]
    if actual != expected:
        raise RuntimeError('Niepoprawna suma kontrolna ZIP zasobow. Pobierz repozytorium ponownie.')
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        root_resolved = ROOT.resolve()
        for member in archive.infolist():
            target = (ROOT / member.filename).resolve()
            if not target.is_relative_to(root_resolved):
                raise RuntimeError(f'Niebezpieczna sciezka w archiwum: {member.filename}')
        if archive.testzip():
            raise RuntimeError('Archiwum zasobow zawiera bledy CRC.')
        archive.extractall(ROOT)
    if not all(path.is_file() for path in required):
        raise RuntimeError('Archiwum nie zawiera wszystkich potrzebnych plikow.')
    print('Odtworzono zasoby kości i ilustracje z repozytorium.')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt: str, *args):
        if not self.path.endswith(('favicon.ico',)):
            super().log_message(fmt, *args)


def main() -> int:
    parser = argparse.ArgumentParser(description='Lokalny serwer StreamHouse RPG Companion v11.1')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    try:
        restore_media_if_missing()
    except Exception as exc:
        print(f'BLAD: {exc}')
        return 1
    server = None
    for port in range(args.port, args.port + 16):
        try:
            server = http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler)
            break
        except OSError:
            pass
    if server is None:
        print(f'BLAD: Porty {args.port}-{args.port+15} sa zajete lub zablokowane.')
        return 2
    url = f'http://127.0.0.1:{server.server_port}/'
    print(f'\nStreamHouse v11.1 -> {url}')
    print('Dziala tylko na tym komputerze. Zatrzymaj przez Ctrl+C.')
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever(poll_interval=0.3)
    except KeyboardInterrupt:
        print('\nZatrzymano serwer.')
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
