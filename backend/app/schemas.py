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
    status: ApplicationStatus = ApplicationStatus.SAVED
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
    number_applied: int
    number_rejected: int
    number_interviewing: int
    number_offers: int
    applications_this_week: int

