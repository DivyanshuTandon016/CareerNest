from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import Application, utc_now
from ..schemas import (
    ApplicationCreate,
    ApplicationRead,
    ApplicationStats,
    ApplicationUpdate,
)


router = APIRouter(prefix="/applications", tags=["applications"])


def get_application_or_404(application_id: int, session: Session) -> Application:
    application = session.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


def normalized_url(value: str) -> str:
    cleaned = value.rstrip("/")
    if "joinhandshake." in cleaned:
        parts = cleaned.split("?")[0].split("/")
        for index, part in enumerate(parts):
            if part in {"job-search", "jobs"} and index + 1 < len(parts):
                return "/".join([*parts[:index], "jobs", parts[index + 1]]).rstrip("/")

    return cleaned


def matching_application(
    payload: ApplicationCreate, session: Session
) -> Application | None:
    applications = session.exec(select(Application)).all()

    for application in applications:
        same_job_url = normalized_url(application.job_url) == normalized_url(payload.job_url)
        same_role = (
            application.company.casefold() == payload.company.casefold()
            and application.role_title.casefold() == payload.role_title.casefold()
        )

        if same_job_url or same_role:
            return application

    return None


@router.get("", response_model=list[ApplicationRead])
def list_applications(session: Session = Depends(get_session)) -> list[Application]:
    statement = select(Application).order_by(Application.updated_at.desc(), Application.id.desc())
    return list(session.exec(statement).all())


@router.get("/stats/summary", response_model=ApplicationStats)
def get_application_stats(session: Session = Depends(get_session)) -> ApplicationStats:
    applications = list(session.exec(select(Application)).all())
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    companies = {
        application.company.casefold()
        for application in applications
        if application.company.strip()
    }
    source_sites = {
        application.source_site.casefold()
        for application in applications
        if application.source_site
    }
    applied_dates = [
        application.date_applied
        for application in applications
        if application.date_applied is not None
    ]

    return ApplicationStats(
        total_applications=len(applications),
        applications_this_week=sum(
            application.date_applied is not None and application.date_applied >= week_start
            for application in applications
        ),
        unique_companies=len(companies),
        source_sites=len(source_sites),
        latest_application=max(applied_dates) if applied_dates else None,
    )


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(
    application_id: int, session: Session = Depends(get_session)
) -> Application:
    return get_application_or_404(application_id, session)


@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate, session: Session = Depends(get_session)
) -> Application:
    existing_application = matching_application(payload, session)
    if existing_application is not None:
        for field, value in payload.model_dump().items():
            if value is not None:
                setattr(existing_application, field, value)

        existing_application.updated_at = utc_now()
        session.add(existing_application)
        session.commit()
        session.refresh(existing_application)
        return existing_application

    application = Application.model_validate(payload)
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


@router.patch("/{application_id}", response_model=ApplicationRead)
def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    session: Session = Depends(get_session),
) -> Application:
    application = get_application_or_404(application_id, session)
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(application, field, value)

    application.updated_at = utc_now()
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int, session: Session = Depends(get_session)
) -> Response:
    application = get_application_or_404(application_id, session)
    session.delete(application)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
