from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .models import TransactionType, BillStatus


# ─── Auth ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─── Account ──────────────────────────────────────────────────────────────────
class AccountCreate(BaseModel):
    name: str
    balance: float = 0.0

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = None

class AccountOut(BaseModel):
    id: int
    name: str
    balance: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Category ─────────────────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    type: TransactionType
    icon: str = "💰"
    color: str = "#6366f1"

class CategoryOut(BaseModel):
    id: int
    name: str
    type: TransactionType
    icon: str
    color: str
    is_default: bool

    model_config = {"from_attributes": True}


# ─── Transaction ──────────────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    account_id: int
    category_id: Optional[int] = None
    type: TransactionType
    amount: float
    description: str
    date: datetime
    notes: Optional[str] = None

class TransactionUpdate(BaseModel):
    category_id: Optional[int] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None

class TransactionOut(BaseModel):
    id: int
    account_id: int
    category_id: Optional[int]
    type: TransactionType
    amount: float
    description: str
    date: datetime
    notes: Optional[str]
    created_at: datetime
    category: Optional[CategoryOut] = None

    model_config = {"from_attributes": True}


# ─── Bill ─────────────────────────────────────────────────────────────────────
class BillCreate(BaseModel):
    category_id: Optional[int] = None
    description: str
    amount: float
    due_date: datetime
    recurring: bool = False
    recurring_day: Optional[int] = None
    notes: Optional[str] = None

class BillUpdate(BaseModel):
    category_id: Optional[int] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[datetime] = None
    status: Optional[BillStatus] = None
    recurring: Optional[bool] = None
    recurring_day: Optional[int] = None
    notes: Optional[str] = None

class BillOut(BaseModel):
    id: int
    category_id: Optional[int]
    description: str
    amount: float
    due_date: datetime
    status: BillStatus
    recurring: bool
    recurring_day: Optional[int]
    notes: Optional[str]
    created_at: datetime
    category: Optional[CategoryOut] = None

    model_config = {"from_attributes": True}


# ─── Dashboard ────────────────────────────────────────────────────────────────
class DashboardSummary(BaseModel):
    total_balance: float
    monthly_income: float
    monthly_expenses: float
    monthly_balance: float
    pending_bills: float
    accounts: List[AccountOut]
    recent_transactions: List[TransactionOut]
    expense_by_category: List[dict]
