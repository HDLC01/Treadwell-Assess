"""Foundation smoke test (stdlib only): exercises the full candidate flow against a
running local API and sanity-checks the scoring direction. Run:
    ./.venv/Scripts/python.exe smoke_test.py
"""

from __future__ import annotations

import json
import urllib.request

BASE = "http://127.0.0.1:8897/api"


def call(method: str, path: str, body: dict | None = None):
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def main() -> None:
    meta = call("GET", "/assess/demo")
    words = meta["words"]
    assert len(words) >= 80, f"expected ~88 words, got {len(words)}"
    assert len(meta["prompts"]) == 2
    assert all(set(w) == {"id", "word"} for w in words[:5]), "factor mapping must not leak"
    print(f"GET /assess/demo OK - job '{meta['job_name']}', {len(words)} words, mappings hidden")

    cand = call("POST", "/assess/demo/start", {"full_name": "Smoke Test", "email": "smoke@test.local"})
    cid = cand["candidate_id"]
    print(f"start OK - candidate {cid[:8]}...")

    # Pick words by their text to steer the result: a driving, social, fast, informal
    # person -> expect high A and B, low C and D, and a Catalyst/Dynamo-ish profile.
    by_word = {w["word"]: w["id"] for w in words}
    real_you = ["assertive", "decisive", "competitive", "bold", "direct", "ambitious",
                "outgoing", "persuasive", "enthusiastic", "lively",
                "restless", "quick-paced", "spontaneous",
                "casual", "informal", "improvisational"]
    expected = ["assertive", "decisive", "driven", "outgoing", "engaging", "convincing",
                "quick-paced", "variety-seeking", "freethinking", "big-picture"]
    body = {
        "candidate_id": cid,
        "checklist1_word_ids": [by_word[w] for w in expected],
        "checklist2_word_ids": [by_word[w] for w in real_you],
    }
    result = call("POST", "/assess/demo/behavioral", body)

    f = {x["factor"]: x for x in result["factors"]}
    print("factors:")
    for k in ("A", "B", "C", "D"):
        x = f[k]
        print(f"  {k} {x['name']:<18} self={x['self']:+.2f}  expected={x['self_concept']:+.2f} "
              f" synthesis={x['synthesis']:+.2f}  band={x['band']}")
    prof = result["reference_profile"]
    print(f"profile: {prof['name']} - {prof['tagline']}")

    assert f["A"]["synthesis"] > 0.5, "A should be clearly positive"
    assert f["B"]["synthesis"] > 0.3, "B should be positive"
    assert f["C"]["synthesis"] < 0, "C should be negative"
    assert f["D"]["synthesis"] < 0, "D should be negative"
    assert prof is not None and prof["name"], "a profile must match"

    # validation: too few words -> 422
    try:
        call("POST", "/assess/demo/behavioral",
             {"candidate_id": cid, "checklist1_word_ids": [1, 2], "checklist2_word_ids": [3]})
        raise SystemExit("FAIL: expected 422 for too-few words")
    except urllib.error.HTTPError as e:
        assert e.code == 422, f"expected 422, got {e.code}"
        print("validation OK - too-few words rejected (422)")

    # bad token -> 404
    try:
        call("GET", "/assess/not-a-real-token")
        raise SystemExit("FAIL: expected 404 for bad token")
    except urllib.error.HTTPError as e:
        assert e.code == 404
        print("validation OK - bad token rejected (404)")

    print("\nSMOKE TEST PASS")


if __name__ == "__main__":
    main()
