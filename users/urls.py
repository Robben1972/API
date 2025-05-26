from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    UsersView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('', UsersView.as_view(), name='users'),
]
