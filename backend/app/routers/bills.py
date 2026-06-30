from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract
from typing import List, Optional
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/bills", tags=["bills"])


@router.post("/", response_model=schemas.BillOut, status_code=201)
def list_bills(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Bill)
        .options(joinedload(models.Bill.category))
        .filter(models.Bill.user_id == current_user.id)
    )

    if month:
        query = query.filter(extract("month", models.Bill.due_date) == month)
    if year:
        query = query.filter(extract("year", models.Bill.due_date) == year)
    if status:
        query = query.filter(models.Bill.status == status)

    return query.order_by(models.Bill.due_date.asc()).all()


@router.post("", response_model=schemas.BillOut, status_code=201)
def create_bill(
    data: schemas.BillCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bill = models.Bill(user_id=current_user.id, **data.model_dump())
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return (
        db.query(models.Bill)
        .options(joinedload(models.Bill.category))
        .filter(models.Bill.id == bill.id)
        .first()
    )


@router.put("/{bill_id}", response_model=schemas.BillOut)
def update_bill(
    bill_id: int,
    data: schemas.BillUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bill = db.query(models.Bill).filter(
        models.Bill.id == bill_id,
        models.Bill.user_id == current_user.id,
    ).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(bill, field, value)
    db.commit()
    db.refresh(bill)

    return (
        db.query(models.Bill)
        .options(joinedload(models.Bill.category))
        .filter(models.Bill.id == bill.id)
        .first()
    )


@router.delete("/{bill_id}", status_code=204)
def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    bill = db.query(models.Bill).filter(
        models.Bill.id == bill_id,
        models.Bill.user_id == current_user.id,
    ).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")
    db.delete(bill)
    db.commit()
