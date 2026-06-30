import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base
from .routers import auth, accounts, categories, transactions, bills, dashboard, chat

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinanceApp API",
    description="API para gerenciamento financeiro pessoal",
    version="1.0.0",
)

# CORS
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(bills.router)
app.include_router(dashboard.router)
app.include_router(chat.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve React frontend in production
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        return FileResponse(index_file)
