import os
from datetime import date, timedelta

from sqlmodel import Session, select

from .database import create_db_and_tables, engine
from .models import Application, ApplicationStatus


def sample_applications() -> list[Application]:
    today = date.today()
    return [
        Application(
            company="Northstar Labs",
            role_title="Software Engineer Intern",
            location="Phoenix, AZ",
            job_url="https://jobs.example.com/northstar/software-engineer-intern",
            source_site="jobs.example.com",
            status=ApplicationStatus.APPLIED,
            date_applied=today,
            notes="Captured from a campus job board.",
            resume_version="intern-frontend-v2.pdf",
        ),
        Application(
            company="Harbor Analytics",
            role_title="Data Analyst",
            location="Remote",
            job_url="https://careers.example.com/harbor/data-analyst",
            source_site="careers.example.com",
            status=ApplicationStatus.APPLIED,
            date_applied=today - timedelta(days=2),
            deadline=today + timedelta(days=5),
            notes="Captured from a job board.",
            resume_version="analytics-portfolio.pdf",
        ),
        Application(
            company="Summit Systems",
            role_title="Backend Developer",
            location="Tempe, AZ",
            job_url="https://work.example.com/summit/backend-developer",
            source_site="work.example.com",
            status=ApplicationStatus.APPLIED,
            date_applied=today - timedelta(days=10),
            notes="Captured from a job board.",
            resume_version="backend-v1.pdf",
        ),
        Application(
            company="Juniper Health",
            role_title="Product Engineering Fellow",
            location="Scottsdale, AZ",
            job_url="https://apply.example.com/juniper/product-engineering-fellow",
            source_site="apply.example.com",
            status=ApplicationStatus.APPLIED,
            date_applied=today - timedelta(days=4),
            notes="Captured from a job board.",
            resume_version="fullstack-v3.pdf",
        ),
    ]


def seed_if_empty() -> None:
    cleanup_legacy_sample_applications()
    normalize_application_history()

    if os.getenv("CAREERNEST_SEED_SAMPLE", "false").lower() in {"0", "false", "no"}:
        return

    with Session(engine) as session:
        existing_application = session.exec(select(Application.id).limit(1)).first()
        if existing_application is not None:
            return

        session.add_all(sample_applications())
        session.commit()


def cleanup_legacy_sample_applications() -> None:
    sample_urls = {application.job_url for application in sample_applications()}

    with Session(engine) as session:
        applications = session.exec(select(Application)).all()
        for application in applications:
            if application.job_url in sample_urls:
                session.delete(application)

        session.commit()


def normalize_application_history() -> None:
    with Session(engine) as session:
        applications = session.exec(select(Application)).all()
        for application in applications:
            if application.status != ApplicationStatus.APPLIED:
                application.status = ApplicationStatus.APPLIED
                session.add(application)

        session.commit()


if __name__ == "__main__":
    create_db_and_tables()
    seed_if_empty()
    print("CareerNest sample data is ready.")
