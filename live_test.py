"""Live smoke test for the deployed production URLs (Railway)."""
import json
import sys
import urllib.request

BASE = "https://better-than-yesterday-production.up.railway.app"


def req(url, method="GET", body=None, headers=None, timeout=30):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, dict(resp.headers), resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode()


def main():
    results = []

    # 1. health
    s, h, b = req(BASE + "/health")
    ok = s == 200 and "ok" in b
    results.append(("x402 LIVE /health", s, ok))

    # 2. premium endpoint WITHOUT payment -> 402 + PAYMENT-REQUIRED
    s, h, b = req(BASE + "/api/premium/productivity-report")
    ok = s == 402 and "PAYMENT-REQUIRED" in str(h)
    results.append(("x402 LIVE premium no-payment -> 402 + header", s, ok))

    if ok:
        pr = h.get("PAYMENT-REQUIRED", "")
        try:
            import base64
            # parse JWT-ish payload (second segment)
            payload = pr.split(".")[1]
            pad = "=" * (-len(payload) % 4)
            decoded = base64.urlsafe_b64decode(payload + pad).decode()
            data = json.loads(decoded)
            print("   PAYMENT-REQUIRED resource.url =", data.get("resource", {}).get("url"))
        except Exception as e:
            print("   (could not decode payment request:", e, ")")

    for name, code, good in results:
        print(f"[{'OK' if good else 'FAIL'}] {name} -> HTTP {code}")

    failed = [r for r in results if not r[2]]
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()