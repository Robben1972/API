from django.db import models
from django.conf import settings

class Group(models.Model):
    name = models.CharField(max_length=100, unique=True)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    subscribers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='subscribed_groups', blank=True)

    def __str__(self):
        return self.name

class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, null=True, blank=True)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='received_messages')
    content = models.TextField(blank=True)
    files = models.FileField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender} -> {self.group or self.recipient}: {self.content[:20]}"