import os
import json
import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from pydantic import BaseModel
from .. import models
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = """Você é um assistente de finanças pessoais. Retorne APENAS um JSON:
{"type": "expense" ou "income", "amount": valor_numerico, "description": "descrição", "category_hint": "categoria"}
Se não identificar valor: {"error": "mensagem"}
Exemplos de category_hint: Mercado, Restaurante, Gasolina, Farmácia, Moradia, Roupas, Assinaturas, Lazer, Educação, Salário, Freelance"""


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
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return ChatResponse(success=False, message="ERRO: GEMINI_API_KEY não configurada")

        url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {"contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\nMensagem: {body.message}"}]}]}

        with httpx.Client(timeout=30) as client:
            resp = client.post(url, json=payload)

        if resp.status_code != 200:
            return ChatResponse(success=False, message=f"ERRO Gemini {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        if "```" in raw:
            raw = raw.split("```")[1].lstrip("json").strip()
        parsed = json.loads(raw)

        if "error" in parsed:
            return ChatResponse(success=False, message=parsed["error"])

        tx_type = str(parsed["type"])
        amount = float(parsed["amount"])
        description = str(parsed["description"])
        category_hint = str(parsed.get("category_hint", "")).lower()

        categories = db.query(models.Category).filter(
            models.Category.user_id == current_user.id,
        ).all()

        category = None
        for cat in categories:
            if cat.type.value == tx_type or cat.type == tx_type:
                if category_hint and (category_hint in cat.name.lower() or cat.name.lower() in category_hint):
                    category = cat
                    break

        if not category:
            for cat in categories:
                if cat.type.value == tx_type or cat.type == tx_type:
                    category = cat
                    break

        if not category:
            return ChatResponse(success=False, message=f"ERRO: Nenhuma categoria tipo '{tx_type}' encontrada. Total categorias: {len(categories)}")

        account = db.query(models.Account).filter(
            models.Account.user_id == current_user.id
        ).first()

        if not account:
            return ChatResponse(success=False, message="ERRO: Nenhuma conta encontrada.")

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
        return ChatResponse(
            success=True,
            message=f"✅ {label} de R$ {amount:.2f} cadastrada! ({description} • {category.name} • {account.name})",
            transaction={"id": transaction.id, "type": tx_type, "amount": amount,
                         "description": description, "category": category.name, "account": account.name},
        )

    except Exception as e:
        return ChatResponse(success=False, message=f"ERRO INTERNO: {type(e).__name__}: {str(e)}")
