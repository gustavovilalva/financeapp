from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract, func
from typing import Optional
from datetime import datetime
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardSummary)
def get_dashboard(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.now()
    month = month or now.month
    year = year or now.year

    # Total balance across all accounts
    accounts = db.query(models.Account).filter(
        models.Account.user_id == current_user.id
    ).all()
    total_balance = sum(a.balance for a in accounts)

    # Monthly income
    monthly_income = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "income",
            extract("month", models.Transaction.date) == month,
            extract("year", models.Transaction.date) == year,
        )
        .scalar() or 0.0
    )

    # Monthly expenses
    monthly_expenses = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            extract("month", models.Transaction.date) == month,
            extract("year", models.Transaction.date) == year,
        )
        .scalar() or 0.0
    )

    # Pending bills sum
    pending_bills = (
        db.query(func.sum(models.Bill.amount))
        .filter(
            models.Bill.user_id == current_user.id,
            models.Bill.status == "pending",
            extract("month", models.Bill.due_date) == month,
            extract("year", models.Bill.due_date) == year,
        )
        .scalar() or 0.0
    )

    # Recent transactions (last 10)
    recent_transactions = (
        db.query(models.Transaction)
        .options(joinedload(models.Transaction.category))
        .filter(models.Transaction.user_id == current_user.id)
        .order_by(models.Transaction.date.desc())
        .limit(10)
        .all()
    )

    # Expenses grouped by category for the month
    expense_by_cat = (
        db.query(
            models.Category.name,
            models.Category.icon,
            models.Category.color,
            func.sum(models.Transaction.amount).label("total"),
        )
        .join(models.Transaction, models.Transaction.category_id == models.Category.id)
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.type == "expense",
            extract("month", models.Transaction.date) == month,
            extract("year", models.Transaction.date) == year,
        )
        .group_by(models.Category.name, models.Category.icon, models.Category.color)
        .order_by(func.sum(models.Transaction.amount).desc())
        .all()
    )

    expense_by_category = [
        {"name": r.name, "icon": r.icon, "color": r.color, "total": float(r.total)}
        for r in expense_by_cat
    ]

    return {
        "total_balance": total_balance,
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "monthly_balance": monthly_income - monthly_expenses,
        "pending_bills": pending_bills,
        "accounts": accounts,
        "recent_transactions": recent_transactions,
        "expense_by_category": expense_by_category,
    }
