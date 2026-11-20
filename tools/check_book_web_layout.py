#!/usr/bin/env python3
"""Serve the built book artifact and run its responsive browser layout checks."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import threading

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'book/web/site'


def main():
    if not (SITE / 'index.html').is_file():
        raise SystemExit('Missing built book web edition; run MkDocs first.')

    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(SITE)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        return subprocess.run(['node', 'book/check_figure_layout.mjs',
                               f'http://127.0.0.1:{server.server_port}/',
                               '--all', '--built-artifact'], cwd=ROOT).returncode
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == '__main__':
    raise SystemExit(main())
