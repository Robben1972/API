from django.urls import path
from .views import CreateGroupView, SubscribeToGroupView, UnsubscribeFromGroupView, GroupListView, ChatHistoryView, GroupHistoryView

urlpatterns = [
    path('create/', CreateGroupView.as_view(), name='create-group'),
    path('<int:group_id>/subscribe/', SubscribeToGroupView.as_view(), name='subscribe-group'),
    path('<int:group_id>/unsubscribe/', UnsubscribeFromGroupView.as_view(), name='unsubscribe-group'),
    path('', GroupListView.as_view(), name='group-list'),
    path('chat/history/<str:room_name>/', ChatHistoryView.as_view(), name='chat-history'),
    path('group/history/<str:room_name>/', GroupHistoryView.as_view(), name='group-history'),
]