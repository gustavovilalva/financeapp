from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract
from typing import List, Optional
from datetime import datetime
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _adjust_balance(db: Session, account_id: int, user_id: int, amount: float, tx_type: str):
    account = db.query(models.Account).filter(
        models.Account.id == account_id,
        models.Account.user_id == user_id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    if tx_type == "income":
        account.balance += amount
    else:
        account.balance -= amount
    return account


@router.get("/", response_model=List[schemas.TransactionOut])
def list_transactions(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Transaction)
        .options(joinedload(models.Transaction.category))
        .filter(models.Transaction.user_id == current_user.id)
    )

    if month:
        query = query.filter(extract("month", models.Transaction.date) == month)
    if year:
        query = query.filter(extract("year", models.Transaction.date) == year)
    if type:
        query = query.filter(models.Transaction.type == type)
    if category_id:
        query = query.filter(models.Transaction.category_id == category_id)

    return query.order_by(models.Transaction.date.desc()).all()


@router.post("/", response_model=schemas.TransactionOut, status_code=201)
def create_transaction(
    data: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    account = _adjust_balance(db, data.account_id, current_user.id, data.amount, data.type)

    transaction = models.Transaction(user_id=current_user.id, **data.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # Reload with category
    return (
        db.query(models.Transaction)
        .options(joinedload(models.Transaction.category))
        .filter(models.Transaction.id == transaction.id)
        .first()
    )


@router.put("/{transaction_id}", response_model=schemas.TransactionOut)
def update_transaction(
    transaction_id: int,
    data: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")

    # If amount changed, revert old and apply new
    if data.amount is not None and data.amount != tx.amount:
        # revert old
        account = db.query(models.Account).filter(models.Account.id == tx.account_id).first()
        if tx.type == "income":
            account.balance -= tx.amount
            account.balance += data.amount
        else:
            account.balance += tx.amount
            account.balance -= data.amount

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)

    db.commit()
    db.refresh(tx)

    return (
        db.query(models.Transaction)
        .options(joinedload(models.Transaction.category))
        .filter(models.Transaction.id == tx.id)
        .first()
    )


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")

    # Revert balance
    account = db.query(models.Account).filter(models.Account.id == tx.account_id).first()
    if account:
        if tx.type == "income":
            account.balance -= tx.amount
        else:
            account.balance += tx.amount

    db.delete(tx)
    db.commit()
