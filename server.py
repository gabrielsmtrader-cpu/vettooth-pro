#!/usr/bin/env python3
import http.server, os, urllib.parse

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = urllib.parse.unquote(path.split('?')[0].split('#')[0])
        # serve VetTooth Pro (without ext) as VetTooth Pro.html
        if p in ('/', '/VetTooth Pro', '/VetTooth%20Pro'):
            p = '/VetTooth Pro.html'
        base = os.getcwd()
        return base + p.replace('/', os.sep)

    def log_message(self, fmt, *args):
        print(f"{self.path} -> {fmt % args}")

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    http.server.HTTPServer(('', 4200), Handler).serve_forever()
