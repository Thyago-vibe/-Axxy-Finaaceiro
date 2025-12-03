# Guia de Configuração do Backend (Django)

Este guia contém todo o código necessário para subir o servidor backend que se comunica com o frontend do Axxy Finance.

## 1. Configuração Inicial

Abra seu terminal e execute:

```bash
# Criar ambiente virtual (opcional mas recomendado)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependências
pip install django djangorestframework django-cors-headers

# Criar projeto
django-admin startproject axxy_backend
cd axxy_backend

# Criar app da API
python manage.py startapp api
```

## 2. Configurar `axxy_backend/settings.py`

Adicione as libs instaladas e configure o CORS para aceitar requisições do seu Frontend (localhost:3000 ou similar).

```python
INSTALLED_APPS = [
    # ... apps padrão ...
    'rest_framework',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # Adicione no topo
    # ... outros middlewares ...
]

# Permitir acesso do Frontend (React/Vite geralmente roda na 5173 ou 3000)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]

# Opcional: Permitir tudo para desenvolvimento
CORS_ALLOW_ALL_ORIGINS = True 
```

## 3. Criar Modelos (`api/models.py`)

```python
from django.db import models

class Profile(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    avatar = models.TextField(blank=True, null=True) # Base64 ou URL

class Account(models.Model):
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=50)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    color = models.CharField(max_length=50)
    icon = models.CharField(max_length=50)

class Category(models.Model):
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=50) # Receita ou Despesa
    color = models.CharField(max_length=50)

class Transaction(models.Model):
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=10, choices=[('income', 'Income'), ('expense', 'Expense')])
    date = models.DateField()
    category = models.CharField(max_length=100)
    status = models.CharField(max_length=20, default='completed')

class Goal(models.Model):
    name = models.CharField(max_length=100)
    current_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    target_amount = models.DecimalField(max_digits=10, decimal_places=2)
    deadline = models.DateField()
    color = models.CharField(max_length=50, default='bg-green-500')
    image_url = models.TextField(blank=True, null=True)

class Budget(models.Model):
    category = models.CharField(max_length=100)
    limit = models.DecimalField(max_digits=10, decimal_places=2)
    icon = models.CharField(max_length=50)
    # 'spent' será calculado dinamicamente com base nas transações

class Debt(models.Model):
    name = models.CharField(max_length=100)
    remaining = models.DecimalField(max_digits=10, decimal_places=2)
    monthly = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20) # Em dia, Pendente, Atrasado

class Alert(models.Model):
    category = models.CharField(max_length=100)
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    threshold = models.IntegerField()
    enabled = models.BooleanField(default=True)
    icon_name = models.CharField(max_length=50)
    color_class = models.CharField(max_length=50)
```

## 4. Criar Serializers (`api/serializers.py`)

Crie este arquivo dentro da pasta `api`. Note o uso de `source=` para converter snake_case (Python) para camelCase (Javascript).

```python
from rest_framework import serializers
from .models import *
from django.db.models import Sum

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class GoalSerializer(serializers.ModelSerializer):
    currentAmount = serializers.DecimalField(source='current_amount', max_digits=10, decimal_places=2)
    targetAmount = serializers.DecimalField(source='target_amount', max_digits=10, decimal_places=2)
    imageUrl = serializers.CharField(source='image_url', required=False, allow_blank=True)

    class Meta:
        model = Goal
        fields = ['id', 'name', 'currentAmount', 'targetAmount', 'deadline', 'color', 'imageUrl']

class BudgetSerializer(serializers.ModelSerializer):
    spent = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = ['id', 'category', 'spent', 'limit', 'icon']

    def get_spent(self, obj):
        # Calcula o gasto total da categoria deste orçamento
        total = Transaction.objects.filter(category=obj.category, type='expense').aggregate(Sum('amount'))['amount__sum']
        return total or 0

class DebtSerializer(serializers.ModelSerializer):
    dueDate = serializers.DateField(source='due_date')
    
    class Meta:
        model = Debt
        fields = ['id', 'name', 'remaining', 'monthly', 'dueDate', 'status']

class AlertSerializer(serializers.ModelSerializer):
    iconName = serializers.CharField(source='icon_name')
    colorClass = serializers.CharField(source='color_class')

    class Meta:
        model = Alert
        fields = ['id', 'category', 'budget', 'threshold', 'enabled', 'iconName', 'colorClass']
```

## 5. Criar Views (`api/views.py`)

Aqui implementamos a lógica dos Endpoints.

```python
from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import *
from .serializers import *
import datetime

# --- CRUDs Padrão ---
class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().order_by('-date')
    serializer_class = TransactionSerializer

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class GoalViewSet(viewsets.ModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer

class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer

class DebtViewSet(viewsets.ModelViewSet):
    queryset = Debt.objects.all()
    serializer_class = DebtSerializer

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer

# --- Views Específicas ---

@api_view(['GET', 'POST'])
def profile_view(request):
    try:
        profile = Profile.objects.first()
    except:
        profile = None

    if request.method == 'GET':
        if not profile:
            return Response({'name': 'Usuário', 'email': '', 'avatar': ''})
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        if profile:
            serializer = ProfileSerializer(profile, data=request.data)
        else:
            serializer = ProfileSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

@api_view(['GET'])
def leakage_analysis_view(request):
    # Lógica Mockada (Simulando IA)
    # Em produção, você conectaria isso a uma lógica real de análise
    data = {
        "totalPotential": 215.90,
        "leaksCount": 4,
        "period": "Últimos 30 Dias",
        "suggestions": [
            {
                "id": "1",
                "title": "Assinaturas Não Utilizadas",
                "description": "Você tem 2 serviços de streaming pouco usados.",
                "amount": 45.90,
                "actionLabel": "Cancelar",
                "category": "subscription"
            },
            {
                "id": "2",
                "title": "Compras Impulsivas",
                "description": "Identificamos 3 compras de fast-food acima da média.",
                "amount": 120.00,
                "actionLabel": "Ver Detalhes",
                "category": "impulse"
            }
        ]
    }
    return Response(data)

@api_view(['GET'])
def predictive_analysis_view(request):
    # Mock data for Prediction
    current_balance = 15230.50 # Pode vir de Account.objects.aggregate...
    
    data = {
        "currentBalance": current_balance,
        "monthlyIncome": 5800.00,
        "baseExpense": 3200.00,
        "scenarios": [
            {"id": 1, "label": "Cortar fast-food", "savings": 450, "checked": True, "iconName": "ShoppingBag", "color": "text-purple-400"},
            {"id": 2, "label": "Cancelar streaming", "savings": 89.90, "checked": False, "iconName": "Clapperboard", "color": "text-blue-400"},
            {"id": 3, "label": "Reduzir Uber/99", "savings": 200, "checked": True, "iconName": "Car", "color": "text-yellow-400"}
        ]
    }
    return Response(data)

@api_view(['GET'])
def interconnected_summary_view(request):
    active_goals = Goal.objects.all()[:2]
    upcoming_debts = Debt.objects.all().order_by('due_date')[:2]
    
    # Serializar
    goals_data = GoalSerializer(active_goals, many=True).data
    debts_data = DebtSerializer(upcoming_debts, many=True).data

    # Adicionar flag isUrgent manualmente
    for debt in debts_data:
        # Lógica simples: se vence nos próximos 7 dias é urgente
        debt['isUrgent'] = True 

    data = {
        "activeGoals": goals_data,
        "upcomingDebts": debts_data,
        "insights": {
            "bestDecisions": [
                "Você economizou R$ 85 em restaurantes este mês.",
                "Sua meta de emergência está quase completa."
            ],
            "suggestedCuts": [
                {"text": "Considere reduzir gastos com assinaturas.", "value": 120}
            ]
        }
    }
    return Response(data)

@api_view(['GET'])
def reports_view(request):
    # params: range, account
    range_filter = request.GET.get('range', 'this-month')
    
    # Mock KPI Data
    kpi = {
        "totalSpent": 4250.75,
        "totalSpentChange": 12,
        "topCategory": "Alimentação",
        "topCategoryValue": 1150.00,
        "transactionCount": 82,
        "transactionCountChange": -5
    }
    
    # Mock Distribution Data
    distribution = [
        {"name": "Alimentação", "value": 1150.00, "percentage": 27.0, "color": "#fb923c"},
        {"name": "Moradia", "value": 980.50, "percentage": 23.1, "color": "#c084fc"},
        {"name": "Transporte", "value": 750.25, "percentage": 17.6, "color": "#38bdf8"},
        {"name": "Lazer", "value": 620.00, "percentage": 14.6, "color": "#facc15"}
    ]
    
    return Response({
        "kpi": kpi,
        "distribution": distribution
    })
```

## 6. Configurar URLs (`api/urls.py` e `axxy_backend/urls.py`)

Crie o arquivo `api/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'transactions', views.TransactionViewSet)
router.register(r'accounts', views.AccountViewSet)
router.register(r'categories', views.CategoryViewSet)
router.register(r'goals', views.GoalViewSet)
router.register(r'budgets', views.BudgetViewSet)
router.register(r'debts', views.DebtViewSet)
router.register(r'alerts', views.AlertViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('profile/', views.profile_view),
    path('leakage-analysis/', views.leakage_analysis_view),
    path('predictive-analysis/', views.predictive_analysis_view),
    path('interconnected-summary/', views.interconnected_summary_view),
    path('reports/', views.reports_view),
]
```

No arquivo principal `axxy_backend/urls.py`, inclua as rotas da API:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
```

## 7. Executar

```bash
# Criar as tabelas no banco de dados
python manage.py makemigrations
python manage.py migrate

# Iniciar o servidor
python manage.py runserver
```

Seu backend estará rodando em `http://localhost:8000/api/` e pronto para conectar com o Frontend!
