"""Local-only static server. No result collection or remote network calls."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def log_message(self, *_):
        pass

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    handler = partial(Handler, directory=str(root))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'Verbal N-back pre: http://127.0.0.1:{args.port}/', flush=True)
    server.serve_forever()
