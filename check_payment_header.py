"""Print the raw PAYMENT-REQUIRED header from the live x402 service."""
import urllib.request

BASE = "https://better-than-yesterday-production.up.railway.app"
r = urllib.request.Request(BASE + "/api/premium/productivity-report")
try:
    urllib.request.urlopen(r)
except urllib.error.HTTPError as e:
    pr = e.headers.get("PAYMENT-REQUIRED", "")
    print("RAW PAYMENT-REQUIRED header:")
    print(pr)
    print()
    print("Contains localhost? ->", "localhost" in pr or "127.0.0.1" in pr)
    print("Contains production host? ->", "better-than-yesterday-production.up.railway.app" in pr)