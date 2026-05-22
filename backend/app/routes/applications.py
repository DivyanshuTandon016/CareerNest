from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from ..database import get_session
from ..models import Application, ApplicationStatus, utc_now
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


@router.get("", response_model=list[ApplicationRead])
def list_applications(session: Session = Depends(get_session)) -> list[Application]:
    statement = select(Application).order_by(Application.updated_at.desc(), Application.id.desc())
    return list(session.exec(statement).all())


@router.get("/stats/summary", response_model=ApplicationStats)
def get_application_stats(session: Session = Depends(get_session)) -> ApplicationStats:
    applications = list(session.exec(select(Application)).all())
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    return ApplicationStats(
        total_applications=len(applications),
        number_applied=sum(
            application.status == ApplicationStatus.APPLIED for application in applications
        ),
        number_rejected=sum(
            application.status == ApplicationStatus.REJECTED for application in applications
        ),
        number_interviewing=sum(
            application.status == ApplicationStatus.INTERVIEW for application in applications
        ),
        number_offers=sum(
            application.status == ApplicationStatus.OFFER for application in applications
        ),
        applications_this_week=sum(
            application.date_applied is not None and application.date_applied >= week_start
            for application in applications
        ),
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

