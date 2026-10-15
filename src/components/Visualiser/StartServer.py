import http.server
import socketserver
import threading

PORT = 25565


class UnityWebGLHandler(http.server.SimpleHTTPRequestHandler):

    def guess_type(self, path):
        if path.endswith(".br"):
            path = path[:-3]
        elif path.endswith(".gz"):
            path = path[:-3]

        if path.endswith(".js"):
            return "application/javascript"
        elif path.endswith(".wasm"):
            return "application/wasm"
        elif path.endswith(".data"):
            return "application/octet-stream"
        elif path.endswith(".json"):
            return "application/json"

        return super().guess_type(path)

    def end_headers(self):
        path = self.translate_path(self.path)

        if path.endswith(".br"):
            self.send_header("Content-Encoding", "br")
        elif path.endswith(".gz"):
            self.send_header("Content-Encoding", "gzip")

        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")

        super().end_headers()


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


class ServerThread(threading.Thread):
    def __init__(self, httpd):
        super().__init__(daemon=True)
        self.httpd = httpd

    def run(self):
        self.httpd.serve_forever()


def main():
    with ReusableTCPServer(("", PORT), UnityWebGLHandler) as httpd:
        server_thread = ServerThread(httpd)
        server_thread.start()

        print(f"Unity WebGL Server: http://localhost:{PORT}")
        print("Press 'q' + Enter to stop.")

        try:
            while True:
                key = input().strip().lower()

                if key == "q":
                    break

        except (KeyboardInterrupt, EOFError):
            pass

        finally:
            print("Shutting down server...")
            httpd.shutdown()
            server_thread.join()
            print("Server stopped.")


if __name__ == "__main__":
    main()