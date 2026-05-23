from datetime import date, datetime
from typing import Optional

from pydantic import ConfigDict
from sqlmodel import SQLModel

from .models import ApplicationStatus


class ApplicationBase(SQLModel):
    company: str
    role_title: str
    location: Optional[str] = None
    job_url: str
    source_site: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.APPLIED
    date_applied: Optional[date] = None
    deadline: Optional[date] = None
    notes: Optional[str] = None
    resume_version: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(SQLModel):
    company: Optional[str] = None
    role_title: Optional[str] = None
    location: Optional[str] = None
    job_url: Optional[str] = None
    source_site: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    date_applied: Optional[date] = None
    deadline: Optional[date] = None
    notes: Optional[str] = None
    resume_version: Optional[str] = None


class ApplicationRead(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class ApplicationStats(SQLModel):
    total_applications: int
    applications_this_week: int
    unique_companies: int
    source_sites: int
    latest_application: Optional[date] = None
