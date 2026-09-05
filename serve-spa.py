#!/usr/bin/env python3
"""
Простой локальный сервер с поддержкой SPA (как GitHub Pages).
Любые неизвестные пути ( /about, /news, /ru/about ) → отдаёт index.html
"""
import http.server
import socketserver
import os
import urllib.parse

PORT = 8000

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        clean = parsed.path.lstrip('/')

        # Если это реальный файл или директория — отдаём как есть
        if clean == '' or os.path.exists(clean) or os.path.isdir(clean):
            super().do_GET()
            return

        # SPA fallback — отдаём index.html
        self.path = '/index.html'
        super().do_GET()

    def end_headers(self):
        # Отключаем кэш, чтобы изменения сразу были видны
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print("=" * 55)
        print("🚀 Локальный SPA-сервер запущен")
        print(f"   http://localhost:{PORT}")
        print("=" * 55)
        print()
        print("Тестируй эти ссылки (должны работать без 404):")
        print(f"  http://localhost:{PORT}/")
        print(f"  http://localhost:{PORT}/about")
        print(f"  http://localhost:{PORT}/news")
        print(f"  http://localhost:{PORT}/ru/about     (если есть такой язык)")
        print(f"  http://localhost:{PORT}/news/some-slug")
        print()
        print("Также можно проверить старый механизм 404:")
        print(f"  http://localhost:{PORT}/nonexistent-page")
        print()
        print("Нажми Ctrl+C для остановки")
        print("=" * 55)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nСервер остановлен.")
