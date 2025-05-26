from django.contrib import admin
from .models import Message, Group

# Register your models here.
@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    pass



@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    pass