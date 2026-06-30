import os
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from pydantic import BaseModel
from .. import models
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = """Você é um assistente de finanças pessoais. O usuário vai descrever uma transação em linguagem natural (português).

Retorne APENAS um JSON com:
- "type": "expense" para gastos ou "income" para receitas
- "amount": valor numérico
- "description": descrição curta
- "category_hint": categoria em português

Categorias de despesa: Mercado, Restaurante, Gasolina, Farmácia, Moradia, Roupas, Assinaturas, Lazer, Educação, Gasto Inesperado
Categorias de receita: Salário, Freelance, Investimentos

Exemplo de saída: {"type": "expense", "amount": 80.0, "description": "Pizza", "category_hint": "Restaurante"}

Se não identificar valor: {"error": "Não entendi. Tente: gastei 50 reais no mercado"}"""


class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    success: bool
    message: str
    transaction: Optional[dict] = None


@router.post("/", response_model=ChatResponse)
def process_chat(
    body: ChatMessage,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada")

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "parts": [{"text": f"{SYSTEM_PROMPT}\n\nMensagem: {body.message}"}]
            }]
        }
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        parsed = json.loads(raw)

    except json.JSONDecodeError:
        return ChatResponse(success=False, message="Não entendi. Tente: 'gastei 50 reais com mercado'")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=500, detail=f"Erro Gemini: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

    if "error" in parsed:
        return ChatResponse(success=False, message=parsed["error"])

    if not all(k in parsed for k in ["type", "amount", "description"]):
        return ChatResponse(success=False, message="Não consegui identificar todas as informações.")

    tx_type = str(parsed["type"])
    amount = float(parsed["amount"])
    description = str(parsed["description"])
    category_hint = str(parsed.get("category_hint", "")).lower()

    if amount <= 0:
        return ChatResponse(success=False, message="Valor inválido.")

    categories = db.query(models.Category).filter(
        models.Category.user_id == current_user.id,
        models.Category.type == tx_type,
    ).all()

    category = None
    for cat in categories:
        if category_hint in cat.name.lower() or cat.name.lower() in category_hint:
            category = cat
            break
    if not category and categories:
        category = categories[0]

    if not category:
        return ChatResponse(success=False, message="Nenhuma categoria encontrada.")

    account = db.query(models.Account).filter(
        models.Account.user_id == current_user.id
    ).first()

    if not account:
        return ChatResponse(success=False, message="Nenhuma conta encontrada.")

    if tx_type == "income":
        account.balance += amount
    else:
        account.balance -= amount

    transaction = models.Transaction(
        user_id=current_user.id,
        account_id=account.id,
        category_id=category.id,
        type=tx_type,
        amount=amount,
        description=description,
        date=date.today(),
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    label = "Receita" if tx_type == "income" else "Despesa"
    msg = f"✅ {label} de R$ {amount:.2f} cadastrada! ({description} • {category.name} • {account.name})"

    return ChatResponse(
        success=True,
        message=msg,
        transaction={"id": transaction.id, "type": tx_type, "amount": amount,
                     "description": description, "category": category.name, "account": account.name},
    )
