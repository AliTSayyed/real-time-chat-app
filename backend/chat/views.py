from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from chat.models import ChatMessage, Thread
from django.db.models import Q

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

        messages = thread.chatmessage_thread.all().values('message', 'timestamp', 'sender__username', 'sender__id')
        threads_data.append({
            'sender_username': sender.username,
            'recipient_username': recipient.username,
            'sender_id': sender.id,
            'recipient_id': recipient.id,
            'messages': list(messages),
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

    # Fetch all messages in the thread, ordered by timestamp
    messages = ChatMessage.objects.filter(thread=thread).order_by('timestamp').values(
        'message', 'timestamp', 'sender_id'  # Return sender_id instead of username for frontend filtering
    )

    return Response({'messages': list(messages)}) # use list(messages) to convert messages query set into a python list. 