from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import os

PORT = 8080
ROOT = Path(__file__).parent.resolve()

# Serve files relative to the project root (css/, js/, assets/, index.html).
os.chdir(ROOT)

KNOWN_LANGUAGES = {"en", "ru", "pl"}


def strip_language_prefix(path: str) -> str:
    """ /ru/css/foo.css → /css/foo.css ; /pl/news → /news ; /about → /about """
    if not path or path == "/":
        return path
    parts = [p for p in path.strip("/").split("/") if p]
    if not parts:
        return "/"
    if parts[0].lower() in KNOWN_LANGUAGES:
        rest = parts[1:]
        return "/" + "/".join(rest) if rest else "/"
    return path


class SPAHandler(SimpleHTTPRequestHandler):

    def _maybe_rewrite_to_real_file(self):
        """If the URL has a language prefix (e.g. /ru) and the stripped path
        points to an actual file on disk (css/, js/, assets/, etc.), rewrite
        self.path to the stripped version so the parent serves the correct file.
        Returns the effective path used for decisions.
        """
        parsed = urlparse(self.path)
        orig = parsed.path or "/"
        stripped = strip_language_prefix(orig)

        for candidate in (stripped, orig):
            fs = ROOT / candidate.lstrip("/")
            if fs.is_file():
                self.path = candidate + ("?" + parsed.query if parsed.query else "")
                return candidate
        return orig

    def do_GET(self):
        p = self._maybe_rewrite_to_real_file()
        fs = ROOT / p.lstrip("/")
        if fs.is_file() or fs.is_dir():
            return super().do_GET()

        # SPA fallback for "pretty" routes: no file extension and not an asset path.
        suffix = Path(p).suffix.lower()
        is_asset_path = (
            p.startswith(("/css/", "/js/", "/assets/")) or
            suffix in {".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".map", ".woff", ".woff2", ".ttf"}
        )
        if not suffix and not is_asset_path:
            self.path = "/index.html"
            return super().do_GET()

        self.send_error(404, "File not found")

    def do_HEAD(self):
        # HEAD requests (used by some tools / curl -I) must also get language-prefix rewriting
        # and the same SPA decision as GET.
        p = self._maybe_rewrite_to_real_file()
        fs = ROOT / p.lstrip("/")
        if fs.is_file() or fs.is_dir():
            self.send_head()
            return

        suffix = Path(p).suffix.lower()
        is_asset_path = (
            p.startswith(("/css/", "/js/", "/assets/")) or
            suffix in {".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".map", ".woff", ".woff2", ".ttf"}
        )
        if not suffix and not is_asset_path:
            self.path = "/index.html"
            self.send_head()
            return

        self.send_error(404, "File not found")


if __name__ == "__main__":
    print(f"Server running at http://localhost:{PORT}")
    print("Language-prefixed assets (/ru/css/*, /pl/js/*, ...) are served from root.")
    print("SPA routes (/ru/news, /pl/about, /news, ...) serve index.html.")

    server = HTTPServer(("localhost", PORT), SPAHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()