from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ApplicationStatus(str, Enum):
    APPLIED = "Applied"
    SAVED = "Saved"


class Application(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company: str = Field(index=True, max_length=160)
    role_title: str = Field(index=True, max_length=200)
    location: Optional[str] = Field(default=None, max_length=200)
    job_url: str = Field(max_length=1000)
    source_site: Optional[str] = Field(default=None, index=True, max_length=200)
    status: ApplicationStatus = Field(default=ApplicationStatus.SAVED, index=True)
    date_applied: Optional[date] = Field(default=None, index=True)
    deadline: Optional[date] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    resume_version: Optional[str] = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
