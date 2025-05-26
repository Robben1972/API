import json
import base64
import os
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from chat.models import Message, Group
from users.models import User
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from channels.auth import UserLazyObject
from django.conf import settings


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print(f"Attempting connection to room: {self.scope['url_route']['kwargs']['room_name']}")
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Extract token from query string
        query_string = self.scope.get('query_string', b'').decode()
        token = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=')[1]
                break

        if not token:
            print("No token provided, closing connection")
            await self.close()
            return

        # Validate token and set user
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = await database_sync_to_async(User.objects.get)(id=user_id)
            self.scope['user'] = user
            print(f"User authenticated: {user.username}")
        except (InvalidToken, TokenError, User.DoesNotExist) as e:
            print(f"Token validation failed: {e}")
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print("Connection accepted")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'text')
        message = text_data_json.get('message', '')

        token = self.scope['query_string'].decode().split('token=')[-1]
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = await database_sync_to_async(User.objects.get)(id=user_id)
            print(f"Received message: {message} from {user}")

            file_url = None
            if message_type == 'file':
                # Handle file upload
                filename = text_data_json.get('filename')
                filedata = text_data_json.get('filedata')
                file_url = await self.save_file(filename, filedata, user)
                print(file_url)

            # Save message to database
            await self.save_message(user, self.room_name, message, file_url)

            # Broadcast message to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender': user.username,  # Use username for simplicity
                    'file_url': file_url  # Include file URL if present
                }
            )
            print(f"Message broadcasted to group: {self.room_group_name}")
        except Exception as e:
            print(f"Error processing message: {e}")
            return

    async def chat_message(self, event):
        # Send message to WebSocket client
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender': event['sender'],
            'file_url': event.get('file_url')  # Include file URL if present
        }))

    @database_sync_to_async
    def save_file(self, filename, filedata, user):
        """Save the base64 file data to the filesystem and return the URL."""
        try:
            # Decode base64 data
            file_content = base64.b64decode(filedata)
            
            # Define file path using MEDIA_ROOT
            file_path = os.path.join(settings.MEDIA_ROOT, f"{user.username}_{filename}")
            print(file_path)
            
            # Save file to disk
            with open(file_path, 'wb') as f:
                f.write(file_content)

            # Return the relative URL
            return f"{user.username}_{filename}"
        except Exception as e:
            print(f"Error saving file: {e}")
            return None

    @database_sync_to_async
    def save_message(self, user, room_name, message, file_url=None):
        if isinstance(user, UserLazyObject):
            user = User.objects.get(pk=user.pk)
        print(f"Saving message: {message} for room: {room_name}")
        
        if room_name.startswith('group_'):
            group = Group.objects.get(name=room_name.replace('group_', ''))
            Message.objects.create(sender=user, group=group, content=message, files=file_url)
        else:
            recipient = User.objects.get(username=room_name)
            Message.objects.create(sender=user, recipient=recipient, content=message, files=file_url)
        print("Message saved to database")