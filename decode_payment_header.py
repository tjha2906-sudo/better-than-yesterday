"""Decode the PAYMENT-REQUIRED header from the live x402 service."""
import base64
import json
import urllib.request

BASE = "https://better-than-yesterday-production.up.railway.app"
r = urllib.request.Request(BASE + "/api/premium/productivity-report")
try:
    urllib.request.urlopen(r)
except urllib.error.HTTPError as e:
    pr = e.headers.get("PAYMENT-REQUIRED", "")

    pad = "=" * (-len(pr) % 4)
    try:
        raw = base64.urlsafe_b64decode(pr + pad).decode("utf-8", "replace")
        print("DECODED PAYMENT-REQUIRED:")
        print(raw)
        print()
        try:
            data = json.loads(raw)
            print("resource.url =", data.get("resource", {}).get("url"))
        except Exception as je:
            print("(not plain json:", je, ")")
    except Exception as e:
        print("decode failed:", e)
        print("raw:", pr)