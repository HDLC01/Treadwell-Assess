"""Auth unit tests (stdlib + PyJWT, no server/DB). Run:
    ./.venv/Scripts/python.exe auth_test.py

Exercises the genuine token verifier with HS256-minted tokens, and the
public-path predicate that keeps the candidate flow open while gating employers.
Real Google sign-in / asymmetric JWKS is verified live in the browser.
"""

from __future__ import annotations

import time

import jwt

import auth_supabase
from auth_supabase import AuthError, is_public_path, verify_token, verify_token_claims

SECRET = "test-jwt-secret-padded-to-32+bytes-长"

# Force the verifier onto the HS256 path with a known test secret + domain.
auth_supabase.settings.SUPABASE_JWT_SECRET = SECRET
auth_supabase.settings.AUTH_ALLOWED_DOMAIN = "wetreadwell.com"


def _token(email=None, exp_offset=3600, secret=SECRET):
    claims = {"aud": "authenticated", "exp": int(time.time()) + exp_offset}
    if email is not None:
        claims["email"] = email
    return jwt.encode(claims, secret, algorithm="HS256")


def _expect_auth_error(fn, status):
    try:
        fn()
    except AuthError as e:
        assert e.status == status, f"expected {status}, got {e.status} ({e.detail})"
        return
    raise AssertionError(f"expected AuthError({status}), none raised")


CASES = []


def case(fn):
    CASES.append(fn)
    return fn


# ── verify_token / verify_token_claims ───────────────────────────────────────
@case
def valid_token_returns_lowercased_email():
    assert verify_token("Bearer " + _token("Kyle@WeTreadwell.com")) == "kyle@wetreadwell.com"


@case
def claims_carry_validated_email():
    claims = verify_token_claims("Bearer " + _token("hanz@wetreadwell.com"))
    assert claims["email"] == "hanz@wetreadwell.com"


@case
def wrong_domain_rejected_403():
    _expect_auth_error(lambda: verify_token("Bearer " + _token("kyle@gmail.com")), 403)


@case
def bad_signature_rejected_401():
    _expect_auth_error(
        lambda: verify_token("Bearer " + _token("kyle@wetreadwell.com", secret="wrong-secret")), 401
    )


@case
def expired_token_rejected_401():
    _expect_auth_error(
        lambda: verify_token("Bearer " + _token("kyle@wetreadwell.com", exp_offset=-30)), 401
    )


@case
def missing_header_rejected_401():
    _expect_auth_error(lambda: verify_token(None), 401)


@case
def non_bearer_header_rejected_401():
    _expect_auth_error(lambda: verify_token("Basic abc123"), 401)


@case
def token_without_email_rejected_401():
    _expect_auth_error(lambda: verify_token("Bearer " + _token(email=None)), 401)


# ── is_public_path: candidate flow open, employer routes gated ────────────────
@case
def candidate_flow_is_public():
    assert is_public_path("/api/assess/demo", "GET")
    assert is_public_path("/api/assess/demo/start", "POST")
    assert is_public_path("/api/assess/demo/behavioral", "POST")


@case
def health_and_config_are_public():
    assert is_public_path("/api/health", "GET")
    assert is_public_path("/api/public-config", "GET")


@case
def cors_preflight_is_public():
    assert is_public_path("/api/jobs", "OPTIONS")


@case
def non_api_paths_are_public():
    assert is_public_path("/login", "GET")
    assert is_public_path("/hire", "GET")


@case
def employer_routes_are_gated():
    assert not is_public_path("/api/jobs", "GET")
    assert not is_public_path("/api/jobs", "POST")
    assert not is_public_path("/api/jobs/123/candidates", "GET")
    assert not is_public_path("/api/candidates/123", "PATCH")
    assert not is_public_path("/api/me", "GET")


def main():
    passed = 0
    for fn in CASES:
        fn()
        print(f"  PASS  {fn.__name__}")
        passed += 1
    print(f"\n{passed}/{len(CASES)} auth tests passed.")


if __name__ == "__main__":
    main()
