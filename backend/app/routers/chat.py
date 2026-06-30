import os
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from datetime import date
from pydantic import BaseModel
from .. import models
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = """Você é um assistente de finanças pessoais. O usuário vai descrever uma transação financeira em linguagem natural (português).

Sua tarefa é extrair as informações e retornar um JSON com:
- "type": "expense" para gastos/despesas ou "income" para receitas/entradas
- "amount": valor numérico (apenas o número, sem R$)
- "description": descrição curta do lançamento
- "category_hint": palavra-chave da categoria mais provável em português

Exemplos de category_hint para despesas:
- Mercado, supermercado, feira → "Mercado"
- Restaurante, lanche, pizza, comida, ifood, delivery → "Restaurante"
- Gasolina, combustível, posto → "Gasolina"
- Farmácia, remédio, medicamento → "Farmácia"
- Aluguel → "Moradia"
- Roupa, tênis, calçado → "Roupas"
- Netflix, Spotify, assinatura → "Assinaturas"
- Academia, esporte → "Lazer"
- Escola, curso, faculdade → "Educação"
- Gasto inesperado, conserto, reparo → "Gasto Inesperado"

Exemplos de category_hint para receitas:
- Salário, pagamento → "Salário"
- Freelance, serviço → "Freelance"
- Investimento, dividendo, rendimento → "Investimentos"

Retorne APENAS o JSON, sem texto adicional. Exemplo:
{"type": "expense", "amount": 80.00, "description": "Pizza", "category_hint": "Restaurante"}

Se não conseguir identificar o valor, retorne {"error": "Não consegui identificar o valor. Tente: 'gastei 50 reais com mercado'"}"""


class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    success: bool
    message: str
    transaction: dict | None = None


@router.post("/", response_model=ChatResponse)
def process_chat(
    body: ChatMessage,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada")

    # Call Gemini REST API directly
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "parts": [{
                    "text": f"{SYSTEM_PROMPT}\n\nMensagem do usuário: {body.message}"
                }]
            }]
        }
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw.strip())

    except json.JSONDecodeError:
        return ChatResponse(success=False, message="Não entendi. Tente: 'gastei 50 reais com mercado'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao chamar Gemini: {str(e)}")

    if "error" in parsed:
        return ChatResponse(success=False, message=parsed["error"])

    if not all(k in parsed for k in ["type", "amount", "description"]):
        return ChatResponse(success=False, message="Não consegui identificar todas as informações.")

    tx_type = parsed["type"]
    amount = float(parsed["amount"])
    description = parsed["description"]
    category_hint = parsed.get("category_hint", "")

    if amount <= 0:
        return ChatResponse(success=False, message="Valor inválido.")

    # Find best matching category
    categories = db.query(models.Category).filter(
        models.Category.user_id == current_user.id,
        models.Category.type == tx_type,
    ).all()

    category = None
    if category_hint and categories:
        hint_lower = category_hint.lower()
        for cat in categories:
            if hint_lower in cat.name.lower() or cat.name.lower() in hint_lower:
                category = cat
                break
        if not category:
            category = categories[0]
    elif categories:
        category = categories[0]

    if not category:
        return ChatResponse(success=False, message="Nenhuma categoria encontrada.")

    account = db.query(models.Account).filter(
        models.Account.user_id == current_user.id
    ).first()

    if not account:
        return ChatResponse(success=False, message="Nenhuma conta encontrada. Crie uma conta primeiro.")

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

    type_label = "Receita" if tx_type == "income" else "Despesa"
    msg = f"✅ {type_label} de R$ {amount:.2f} cadastrada! ({description} • {category.name} • {account.name})"

    return ChatResponse(
        success=True,
        message=msg,
        transaction={
            "id": transaction.id,
            "type": tx_type,
            "amount": amount,
            "description": description,
            "category": category.name,
            "account": account.name,
            "date": str(transaction.date),
        },
    )
