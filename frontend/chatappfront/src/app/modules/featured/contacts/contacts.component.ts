import { HttpClient } from '@angular/common/http';
import { Component, HostListener, Input, OnChanges } from '@angular/core';
import {
  ChatMessage,
  ThreadData,
  TypingStart,
  TypingStop,
  SearchCache,
  User,
} from '../../../../types';
import { ChatService } from '../../core/services/chat.service';
import { LastmessageService } from '../../core/services/lastmessage.service';
import { WebsocketService } from '../../core/services/websocket.service';
import {
  debounceTime,
  distinctUntilChanged,
  finalize,
  firstValueFrom,
  Subject,
  takeUntil,
} from 'rxjs';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss',
})
export class ContactsComponent implements OnChanges {
  @Input() isAuthenticated: boolean = false;
  @Input() userID: number | null = null;

  // properties for contact side bar preview
  threads: ThreadData[] = [];
  selectedThread: ThreadData | null = null;
  typingRecipient: { [id: number]: boolean } = {};

  // search related properties
  searchQuery: string = '';
  searchResults: any[] = [];
  showDropdown: boolean = false;
  isSearching: boolean = false;
  searchError: string | null = null;
  selectedIndex: number = -1;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private searchCache: { [key: string]: SearchCache } = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private http: HttpClient,
    private contactToChatService: ChatService,
    private lastMessageService: LastmessageService,
    private websocketService: WebsocketService
  ) {}

  // load all chats a user has after the user has been authenticated.
  ngOnChanges() {
    if (this.isAuthenticated) {
      this.getThreads();
    }
  }

  ngOnInit(): void {
    // Set up search debouncing
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.fetchSearchResults(query);
      });

    // get the last message sent in the thread and display it in the preview
    this.lastMessageService
      .getLatestMessage()
      .subscribe((message: ChatMessage | null) => {
        if (message !== null && message.type === 'chat_message') {
          this.updateMessagePreview(message);
        }
      });
    // check if recipient "is typing..."
    this.websocketService
      .getTypingStatus()
      .subscribe((msg: TypingStart | TypingStop) => {
        const thread = this.threads.find(
          // find the correct thread to update typing status
          (thread) =>
            (thread.recipient_id === msg.recipient_id &&
              thread.sender_id === msg.sender_id) ||
            (thread.recipient_id === msg.sender_id &&
              thread.sender_id === msg.recipient_id)
        );
        if (thread) {
          // if the typing start message has the sender of the user recipient, then that recipient is typing.
          if (
            msg.type === 'typing_start' &&
            msg.sender_id === thread.recipient_id
          ) {
            this.typingRecipient[msg.sender_id] = true; // mark recipient user as typing
          } else if (
            msg.type === 'typing_stop' &&
            msg.sender_id === thread.recipient_id
          ) {
            this.typingRecipient[msg.sender_id] = false; // mark recipient user as no longer typing
          }
        }
      });
  }

  // api to get all the chats a user has
  getThreads(): void {
    this.http.get('http://localhost:8000/api/threads/').subscribe((response: any) => {
      // Sort threads by timestamp before assigning
      this.threads = response.threads;
    });
  }

  // function to update the latest message sent in the thread on the contacts side panel to keep up with the realtime chat.
  updateMessagePreview(message: ChatMessage) {
    // Find the correct thread to update the message. Needs to match the thread for both users so must check if either or cases are true.
    const existingThread = this.threads.find(
      (thread) =>
        (thread.recipient_id === message.recipient_id &&
          thread.sender_id === message.sender_id) ||
        (thread.recipient_id === message.sender_id &&
          thread.sender_id === message.recipient_id)
    );

    if (existingThread) {
      // Update the message data
      existingThread.messages.latest_message = message.message;
      existingThread.messages.timestamp = message.timestamp;
      existingThread.messages.message_sender_id = message.sender_id;
      existingThread.messages.is_read = message.is_read;

      // Remove the thread from the array
      this.threads = this.threads.filter(
        (t) =>
          !(
            t.recipient_id === existingThread.recipient_id &&
            t.sender_id === existingThread.sender_id
          )
      );

      // Add it back at the beginning
      this.threads.unshift(existingThread);

      // If this was the selected thread, update the selection
      if (
        this.selectedThread &&
        this.selectedThread.recipient_id === existingThread.recipient_id &&
        this.selectedThread.sender_id === existingThread.sender_id
      ) {
        this.selectedThread = existingThread;
      }
    }
  }
  // use the shared chat service to obtain the contact data (both usernames and ids) to send to the chat component by saving it to the behavior subject.
  selectContactForChat(sendDataToChat: ThreadData) {
    this.contactToChatService.selectChat(sendDataToChat);
    this.selectedThread = sendDataToChat;
  }

  // Search related methods
  searchUsers(query: string) {
    this.searchQuery = query;
    if (query.length < 2) {
      this.searchResults = [];
      this.showDropdown = true;
      return;
    }

    // Check cache first
    if (
      this.searchCache[query] &&
      this.searchCache[query].timestamp > Date.now() - this.CACHE_DURATION
    ) {
      this.searchResults = this.searchCache[query].results;
      this.showDropdown = true;
      return;
    }

    this.searchSubject.next(query);
  }

  private fetchSearchResults(query: string) {
    this.isSearching = true;
    this.searchError = null;

    this.http
      .get(`http://localhost:8000/api/search-users/?q=${query}`)
      .pipe(finalize(() => (this.isSearching = false)))
      .subscribe({
        next: (results: any) => {
          this.searchCache[query] = {
            results: results,
            timestamp: Date.now(),
          };
          this.searchResults = results;
          this.showDropdown = true;
        },
        error: (error) => {
          this.searchError = 'Failed to fetch results. Please try again.';
          this.searchResults = [];
        },
      });
  }

  async selectUser(user: User) {
    if (user.thread_exists) {
      // Simply find and select the existing thread without reordering
      const existingThread = this.threads.find(t =>
        t.recipient_id === user.id || t.sender_id === user.id
      );
      if (existingThread) {
        this.selectContactForChat(existingThread);
      }
    } else {
      try {
        const response: any = await firstValueFrom(
          this.http.post('http://localhost:8000/api/create-thread/', {
            user_id: user.id
          })
        );
        
        const newThread: ThreadData = {
          sender_id: this.userID!,
          recipient_id: user.id,
          sender_username: response.sender_username,
          recipient_username: user.username,
          messages: {
            message_sender_id: null,
            latest_message: '',
            timestamp: new Date().toString(),
            is_read: false
          }
        };
        
        // New threads still go to the top since they're newly created
        this.threads.unshift(newThread);
        this.selectContactForChat(newThread);
      } catch (error) {
        console.error('Error creating thread:', error);
      }
    }
    this.showDropdown = false;
    this.searchQuery = '';
  }

  // Keyboard navigation
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.showDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(
          this.selectedIndex + 1,
          this.searchResults.length - 1
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        break;
      case 'Enter':
        if (this.selectedIndex >= 0) {
          this.selectUser(this.searchResults[this.selectedIndex]);
        }
        break;
      case 'Escape':
        this.showDropdown = false;
        break;
    }
  }

  // Click outside handler
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const searchContainer = document.getElementById('search');
    if (searchContainer && !searchContainer.contains(event.target as Node)) {
      this.showDropdown = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
