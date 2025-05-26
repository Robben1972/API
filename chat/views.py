from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Group, Message
from .serializers import GroupSerializer, MessageSerializer

class CreateGroupView(APIView):
    def post(self, request):
        data = request.data
        data['creator'] = request.user.id
        serializer = GroupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SubscribeToGroupView(APIView):

    def post(self, request, group_id):
        try:
            group = Group.objects.get(id=group_id)
            group.subscribers.add(request.user)
            return Response({"message": f"Subscribed to {group.name}"}, status=status.HTTP_200_OK)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

class UnsubscribeFromGroupView(APIView):

    def post(self, request, group_id):
        try:
            group = Group.objects.get(id=group_id)
            group.subscribers.remove(request.user)
            return Response({"message": f"Unsubscribed from {group.name}"}, status=status.HTTP_200_OK)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

class GroupListView(generics.ListAPIView):
    serializer_class = GroupSerializer

    def get_queryset(self):
        return Group.objects.all()
    

class ChatHistoryView(APIView):
    def get(self, request, room_name):
        try:
            messages = Message.objects.filter(recipient__username=room_name, sender__username=request.user.username)
            message2 = Message.objects.filter(recipient__username=request.user.username, sender__username=room_name)
            serializer = MessageSerializer(messages | message2, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Message.DoesNotExist:
            return Response({"error": "No messages found"}, status=status.HTTP_404_NOT_FOUND)

class GroupHistoryView(APIView):
    def get(self, request, room_name):
        try:
            group_name = room_name.split('_')[-1]
            group = Group.objects.get(name=group_name)  # Use get() to retrieve a single object
            messages = Message.objects.filter(group_id=group.id)
            serializer = MessageSerializer(messages, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=status.HTTP_404_NOT_FOUND)