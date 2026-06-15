"""Settings — pydantic-settings over .env; dev-safe defaults so the app always starts."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "development"

    POSTGRES_HOST: str = "127.0.0.1"
    POSTGRES_PORT: int = 5434
    POSTGRES_DB: str = "assess"
    POSTGRES_USER: str = "assess"
    POSTGRES_PASSWORD: str = "assess-dev-password"

    DEV_BOOTSTRAP: bool = True

    # Raw factor score -> sigma divisor. Start sensible; calibrate from real data later.
    SCORE_SCALE: float = 2.5

    # ── Cognitive test ───────────────────────────────────────────────────────
    COGNITIVE_NUM_ITEMS: int = 20         # items administered per test (capped by bank size)
    COGNITIVE_TIME_LIMIT_SEC: int = 600   # 10 minutes; client auto-submits at zero
    # Scaled score range [0, COGNITIVE_SCALE_MAX]; an original normed scale that a
    # job's cognitive_target is expressed against. Calibratable from real data later.
    COGNITIVE_SCALE_MAX: int = 30

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # ── Employer auth (Supabase Google sign-in) ──────────────────────────────
    # AUTH ONLY — our application data lives in our own Postgres, never Supabase.
    # When SUPABASE_URL + SUPABASE_ANON_KEY are unset the gate is a no-op so local
    # dev stays open (CLAUDE.md). Reuses the shared Treadwell cloud Supabase project.
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""           # publishable key — safe to expose to the browser
    SUPABASE_JWT_SECRET: str = ""         # legacy HS256 secret (only if the project signs HS256)
    AUTH_ALLOWED_DOMAIN: str = "wetreadwell.com"

    @property
    def auth_enabled(self) -> bool:
        """The employer auth gate activates only once Supabase is configured."""
        return bool(self.SUPABASE_URL and self.SUPABASE_ANON_KEY)

    # ── Email (PDF report delivery) ──────────────────────────────────────────
    # Provider-agnostic SMTP. Unset → "Email report" degrades gracefully (503);
    # Download PDF always works. Fill these to enable sending (any SMTP relay).
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""                   # e.g. "Treadwell Assess <assess@wetreadwell.com>"
    SMTP_STARTTLS: bool = True

    @property
    def email_enabled(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_FROM)

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.ENVIRONMENT != "production"


settings = Settings()
