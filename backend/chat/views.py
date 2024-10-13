from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from chat.models import ChatMessage, Thread
from django.db.models import Q
from django.db.models import F

@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Ensure the user is authenticated
def check_authentication(request):
  return Response({
      'is_authenticated': True,
      'username': request.user.username,
      'user_id': request.user.id,
  })

@api_view(['POST'])
def register(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({"error": "Please provide both username and password."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password)
    refresh = RefreshToken.for_user(user)
    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)
    else:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

# return all threads (dms a user has)
@api_view(['GET'])  # Ensures it is an API view
@permission_classes([IsAuthenticated])  # Ensure the user is authenticated
def threads(request):
    user = request.user  # Ensure the user is authenticated
    
    if user.is_anonymous:  # Check if user is anonymous
        return Response({"error": "User is not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

    # Fetch threads for the authenticated user
    threads = Thread.objects.by_user(user=user).prefetch_related('chatmessage_thread')

    # Format threads for the response
    threads_data = []
    for thread in threads:
        # determine who the sender is and who the recipient is based on which user is logged in
        if thread.first_user == user:
            sender = thread.first_user
            recipient = thread.second_user
        else:
            sender = thread.second_user
            recipient = thread.first_user

        # fetch only the last message sent since this is only used in the contacts message preview (rest of data sent to chat component in frontend)
        last_message = thread.chatmessage_thread.all().order_by('-timestamp').first()
        # messages = thread.chatmessage_thread.all().values('message', 'timestamp', 'sender__username', 'sender__id')
        
        threads_data.append({
            'sender_username': sender.username,
            'recipient_username': recipient.username,
            'sender_id': sender.id,
            'recipient_id': recipient.id,
            'messages': {
                'message_sender_id': last_message.sender_id,
                'latest_message': last_message.message,
                'timestamp': last_message.timestamp,
                'is_read': last_message.is_read,
            },
        })

    return Response({'threads': threads_data})

# return all messages in a thread
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def thread_messages(request, recipient_id):
    user = request.user

    # Try to find a thread between the authenticated user and the recipient
    try:
        thread = Thread.objects.get(
            (Q(first_user=user) & Q(second_user_id=recipient_id)) | 
            (Q(first_user_id=recipient_id) & Q(second_user=user))
        )
    except Thread.DoesNotExist:
        return Response({"error": "Thread does not exist"}, status=404)

    # Fetch all messages in the thread, ordered by timestamp. Only send 30 messages on page load, to view previous messages, user must scroll up.
    # Use a pagination system to retrieve the next 20 messages that were in the thread. 

    limit = int(request.GET.get('limit', 30)) # default to get the last 30 messages in the thread
    offset = int(request.GET.get('offset', 0)) # Start at the latest message 

    messages = ChatMessage.objects.filter(thread=thread).order_by('-timestamp')[offset:offset+limit] # here we get the last 30 items on chat load, or whatever amount the frontend will call in its params. Splice the array. 

    # Paginated response
    serialized_messages = []
    for message in messages:
        serialized_message = {
            'message_id': message.id,
            'message': message.message,
            'timestamp': message.timestamp,
            'sender_id': message.sender.id, # Return sender_id instead of username for frontend filtering, use list(messages) to convert messages query set into a python list. 
            'is_read': message.is_read,
            'recipient_id': recipient_id, # recipient id is from the param. 
        }
       
        serialized_messages.append(serialized_message)
    return Response({'messages': serialized_messages,
                     'has_more': offset + limit < thread.chatmessage_thread.count()
                     }) # send the limited messages and a flag to know if there are more messages still left. 