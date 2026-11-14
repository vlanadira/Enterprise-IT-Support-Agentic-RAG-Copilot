
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.api.routes import router
from app.core.config import get_settings, BASE_DIR
from app.core.logging import configure_logging
from app.services.audit import init_db

configure_logging()
settings = get_settings()
init_db()


app = FastAPI(title=settings.app_name, version="1.0.0")

app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "static")),
    name="static"
)

app.include_router(router)

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    account_holder_name = settings.account_holder_name.strip()
    account_initials = "".join(
        part[0] for part in account_holder_name.split()[:2]
    ).upper()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "app_name": settings.app_name,
            "account_holder_name": account_holder_name,
            "account_initials": account_initials,
        }
    )
