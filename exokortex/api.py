from dataclasses import asdict

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import __version__, capture, db, llm, retrieval
from .config import get_settings

app = FastAPI(title="Exokortex", version=__version__)


def require_token(authorization: str | None = Header(default=None)) -> None:
    token = get_settings().api_token
    if token and authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="Invalid or missing bearer token")


@app.exception_handler(llm.LLMNotConfigured)
async def _not_configured(_request, exc: llm.LLMNotConfigured) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(llm.LLMError)
async def _provider_error(_request, exc: llm.LLMError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": str(exc)})


class CaptureIn(BaseModel):
    content: str = Field(min_length=1)
    title: str | None = None
    source: str = "api"
    source_ref: str | None = None
    metadata: dict = Field(default_factory=dict)


class AskIn(BaseModel):
    question: str = Field(min_length=1)
    limit: int = Field(default=6, ge=1, le=20)


@app.get("/health")
def health() -> dict:
    s = get_settings()
    try:
        with db.connect(s) as conn:
            conn.execute("SELECT 1")
        database = "ok"
    except Exception as exc:
        database = f"error: {exc.__class__.__name__}"
    return {
        "status": "ok" if database == "ok" else "degraded",
        "database": database,
        "embeddings_configured": llm.embeddings_configured(s),
        "llm_configured": llm.chat_configured(s),
    }


router = APIRouter(dependencies=[Depends(require_token)])


@router.post("/capture", status_code=201)
def capture_thought(body: CaptureIn) -> dict:
    try:
        result = capture.capture(
            body.content,
            title=body.title,
            source=body.source,
            source_ref=body.source_ref,
            metadata=body.metadata,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return asdict(result)


@router.get("/search")
def search(q: str = Query(min_length=1), limit: int = Query(default=8, ge=1, le=50)) -> dict:
    return {"results": [asdict(hit) for hit in retrieval.search(q, limit)]}


@router.post("/ask")
def ask(body: AskIn) -> dict:
    return asdict(retrieval.ask(body.question, body.limit))


@router.get("/thoughts/{thought_id}")
def get_thought(thought_id: str) -> dict:
    try:
        thought = capture.get_thought(thought_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Thought not found") from exc
    if thought is None:
        raise HTTPException(status_code=404, detail="Thought not found")
    return thought


app.include_router(router)