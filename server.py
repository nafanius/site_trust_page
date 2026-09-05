from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

PORT = 8080
ROOT = Path(__file__).parent.resolve()


class SPAHandler(SimpleHTTPRequestHandler):

    def do_GET(self):
        path = urlparse(self.path).path

        # Реальный файл или директория — отдаём как обычно
        requested = ROOT / path.lstrip("/")

        if requested.is_file() or requested.is_dir():
            return super().do_GET()

        # SPA routes — отдаём index.html
        if not path.startswith("/assets/") and not Path(path).suffix:
            self.path = "/index.html"
            return super().do_GET()

        # Всё остальное — обычный 404
        self.send_error(404, "File not found")


if __name__ == "__main__":
    print(f"Server running at http://localhost:{PORT}")
    print("SPA routes: /about /news /services ...")

    server = HTTPServer(("localhost", PORT), SPAHandler)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()