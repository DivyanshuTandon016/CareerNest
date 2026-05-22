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
            status=ApplicationStatus.SAVED,
            date_applied=today,
            notes="Saved from a campus job board.",
            resume_version="intern-frontend-v2.pdf",
        ),
        Application(
            company="Harbor Analytics",
            role_title="Data Analyst",
            location="Remote",
            job_url="https://careers.example.com/harbor/data-analyst",
            source_site="careers.example.com",
            status=ApplicationStatus.INTERVIEW,
            date_applied=today - timedelta(days=2),
            deadline=today + timedelta(days=5),
            notes="Recruiter screen scheduled.",
            resume_version="analytics-portfolio.pdf",
        ),
        Application(
            company="Summit Systems",
            role_title="Backend Developer",
            location="Tempe, AZ",
            job_url="https://work.example.com/summit/backend-developer",
            source_site="work.example.com",
            status=ApplicationStatus.REJECTED,
            date_applied=today - timedelta(days=10),
            notes="Keep an eye on future new grad roles.",
            resume_version="backend-v1.pdf",
        ),
        Application(
            company="Juniper Health",
            role_title="Product Engineering Fellow",
            location="Scottsdale, AZ",
            job_url="https://apply.example.com/juniper/product-engineering-fellow",
            source_site="apply.example.com",
            status=ApplicationStatus.OFFER,
            date_applied=today - timedelta(days=4),
            notes="Offer response due next week.",
            resume_version="fullstack-v3.pdf",
        ),
    ]


def seed_if_empty() -> None:
    if os.getenv("CAREERNEST_SEED_SAMPLE", "true").lower() in {"0", "false", "no"}:
        return

    with Session(engine) as session:
        existing_application = session.exec(select(Application.id).limit(1)).first()
        if existing_application is not None:
            return

        session.add_all(sample_applications())
        session.commit()


if __name__ == "__main__":
    create_db_and_tables()
    seed_if_empty()
    print("CareerNest sample data is ready.")

