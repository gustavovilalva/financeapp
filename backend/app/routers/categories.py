from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])

DEFAULT_CATEGORIES = [
    # Income
    {"name": "Salário", "type": "income", "icon": "💼", "color": "#10b981"},
    {"name": "Freelance", "type": "income", "icon": "💻", "color": "#06b6d4"},
    {"name": "Investimentos", "type": "income", "icon": "📈", "color": "#8b5cf6"},
    {"name": "Outros (Receita)", "type": "income", "icon": "💰", "color": "#f59e0b"},
    # Expenses
    {"name": "Moradia / Aluguel", "type": "expense", "icon": "🏠", "color": "#ef4444"},
    {"name": "Mercado", "type": "expense", "icon": "🛒", "color": "#f97316"},
    {"name": "Restaurante / Delivery", "type": "expense", "icon": "🍔", "color": "#eab308"},
    {"name": "Gasolina / Transporte", "type": "expense", "icon": "⛽", "color": "#84cc16"},
    {"name": "Farmácia / Saúde", "type": "expense", "icon": "💊", "color": "#14b8a6"},
    {"name": "Roupas / Calçados", "type": "expense", "icon": "👕", "color": "#6366f1"},
    {"name": "Assinaturas", "type": "expense", "icon": "📺", "color": "#8b5cf6"},
    {"name": "Lazer / Entretenimento", "type": "expense", "icon": "🎉", "color": "#ec4899"},
    {"name": "Educação", "type": "expense", "icon": "📚", "color": "#0ea5e9"},
    {"name": "Gasto Inesperado", "type": "expense", "icon": "⚠️", "color": "#f43f5e"},
    {"name": "Outros (Despesa)", "type": "expense", "icon": "💸", "color": "#94a3b8"},
]


def create_default_categories(db: Session, user_id: int):
    for cat in DEFAULT_CATEGORIES:
        category = models.Category(
            user_id=user_id,
            name=cat["name"],
            type=cat["type"],
            icon=cat["icon"],
            color=cat["color"],
            is_default=True,
        )
        db.add(category)
    db.commit()


@router.post("/", response_model=schemas.CategoryOut, status_code=201)
def list_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Category).filter(models.Category.user_id == current_user.id).all()


@router.post("", response_model=schemas.CategoryOut, status_code=201)
def create_category(
    data: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    category = models.Category(user_id=current_user.id, **data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    category = db.query(models.Category).filter(
        models.Category.id == category_id,
        models.Category.user_id == current_user.id,
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    if category.is_default:
        raise HTTPException(status_code=400, detail="Não é possível excluir categorias padrão")
    db.delete(category)
    db.commit()
