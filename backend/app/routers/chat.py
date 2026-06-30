import os
import json
import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from datetime import date
from pydantic import BaseModel
from .. import models, schemas
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

Se não conseguir identificar o valor, retorne {"error": "Não consegui identificar o valor. Tente: 'gastei 50 reais com mercado'"}
"""


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

    # Call Gemini
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"{SYSTEM_PROMPT}\n\nMensagem do usuário: {body.message}"
        )
        raw = response.text.strip()
        # Remove markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return ChatResponse(success=False, message="Não entendi. Tente: 'gastei 50 reais com mercado'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao chamar Gemini: {str(e)}")

    if "error" in parsed:
        return ChatResponse(success=False, message=parsed["error"])

    # Validate required fields
    if not all(k in parsed for k in ["type", "amount", "description"]):
        return ChatResponse(success=False, message="Não consegui identificar todas as informações. Tente ser mais específico.")

    tx_type = parsed["type"]
    amount = float(parsed["amount"])
    description = parsed["description"]
    category_hint = parsed.get("category_hint", "")

    if amount <= 0:
        return ChatResponse(success=False, message="Valor inválido. Informe um valor positivo.")

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
        return ChatResponse(success=False, message="Nenhuma categoria encontrada. Crie categorias primeiro.")

    # Find first account of user
    account = db.query(models.Account).filter(
        models.Account.user_id == current_user.id
    ).first()

    if not account:
        return ChatResponse(success=False, message="Nenhuma conta encontrada. Crie uma conta bancária primeiro.")

    # Adjust balance
    if tx_type == "income":
        account.balance += amount
    else:
        account.balance -= amount

    # Create transaction
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

    tx_out = (
        db.query(models.Transaction)
        .options(joinedload(models.Transaction.category))
        .filter(models.Transaction.id == transaction.id)
        .first()
    )

    type_label = "Receita" if tx_type == "income" else "Despesa"
    msg = f"✅ {type_label} de R$ {amount:.2f} cadastrada! ({description} • {category.name} • {account.name})"

    return ChatResponse(
        success=True,
        message=msg,
        transaction={
            "id": tx_out.id,
            "type": tx_out.type,
            "amount": tx_out.amount,
            "description": tx_out.description,
            "category": tx_out.category.name if tx_out.category else "",
            "account": account.name,
            "date": str(tx_out.date),
        },
    )
