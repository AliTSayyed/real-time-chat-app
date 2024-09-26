from django.contrib import admin
from chat.models import ChatMessage, Thread

# Define the inline class for ChatMessage
class ChatMessageInline(admin.TabularInline):
    model = ChatMessage

# Define the ModelAdmin for Thread, including the ChatMessageInline
class ThreadAdmin(admin.ModelAdmin):
    inlines = [ChatMessageInline]
    class Meta:
        model = Thread

# Register the Thread model with the custom ThreadAdmin
admin.site.register(Thread, ThreadAdmin)

# You don't need to register ChatMessage separately, as it's being handled inline within Thread
# If you want ChatMessage to appear independently in the admin, use:
admin.site.register(ChatMessage)
