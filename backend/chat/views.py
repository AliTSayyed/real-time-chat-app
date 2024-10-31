from datetime import datetime, timezone
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
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    query = request.GET.get('q','') # default value is '' if no paramter sent from front end.
    current_user = request.user

    # Search for users whose username contains the query, except for the user logged in
    users = User.objects.filter(
        username__icontains=query # search for any username that contians the query, does not have to be exact 
    ).exclude(
        id=current_user.id
    ).values('id', 'username')

    # For each user, check if a thread exists
    users_data = []
    for user in users:
        thread_exists = Thread.objects.filter(
            (Q(first_user=current_user) & Q(second_user = user['id'])) | 
            (Q(first_user=user['id']) & Q(second_user = current_user))
        ).exists() 

        users_data.append({
            'id': user['id'],
            'username': user['username'],
            'thread_exists': thread_exists
        })

    return Response(users_data) # return all the users that exist and if they have a current thread or not. 

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_thread(request):
    other_user_id = request.data.get('user_id') # get the id a user wants to create a chat with. 
    try:
        other_user = User.objects.get(id=other_user_id)
        thread = Thread.objects.filter(   # Check if a thread already exists between these users (in either direction)
            Q(first_user=request.user, second_user=other_user) |
            Q(first_user=other_user, second_user=request.user)
        ).first()

         # If no thread exists, create a new one
        if not thread:
            thread = Thread.objects.create(
                first_user=request.user,
                second_user=other_user
            )

        return Response({
            'thread_id':thread.id,
            'sender_username': request.user.username,
            'recipient_username': other_user.username
        })
    except User.DoesNotExist: # can not create thread with a non existent user. 
        return Response({'error': 'User not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# return all threads (dms a user has)
@api_view(['GET'])  # Ensures it is an API view
@permission_classes([IsAuthenticated])  # Ensure the user is authenticated
def get_threads(request):
    user = request.user  # Ensure the user is authenticated
    
    if user.is_anonymous:  # Check if user is anonymous
        return Response({"error": "User is not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

    # Fetch threads for the authenticated user
    threads = Thread.objects.by_user(user=user).prefetch_related('chatmessage_thread')

    # Separate threads with and without messages
    threads_with_messages = []
    threads_without_messages = []

    # Format threads for the response
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
        
        thread_data = {
            'sender_username': sender.username,
            'recipient_username': recipient.username,
            'sender_id': sender.id,
            'recipient_id': recipient.id,
            'messages': {
                'message_sender_id': None,
                'latest_message': '',
                'timestamp': thread.timestamp,
                'is_read': True,
            }
        }

        if last_message:
            thread_data['messages'].update({
                'message_sender_id': last_message.sender_id,
                'latest_message': last_message.message,
                'timestamp': last_message.timestamp,
                'is_read': last_message.is_read,
            })
            threads_with_messages.append(thread_data)
        else:
            threads_without_messages.append(thread_data)

    # Sort threads with messages by message timestamp
    threads_with_messages.sort(
        key=lambda x: x['messages']['timestamp'],
        reverse=True
    )

    # Sort threads without messages by thread timestamp
    threads_without_messages.sort(
        key=lambda x: x['messages']['timestamp'],
        reverse=True
    )

    # Combine the sorted lists: messages first, then empty threads
    threads_data = threads_with_messages + threads_without_messages

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