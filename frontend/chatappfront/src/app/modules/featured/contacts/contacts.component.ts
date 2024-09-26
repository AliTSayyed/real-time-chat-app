import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss'
})
export class ContactsComponent {
  threads: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getThreads();
  }

  getThreads(): void {
    this.http.get('http://localhost:8000/api/threads/').subscribe((response: any) => {
      this.threads = response.threads;
      console.log(this.threads)
    });
  }
}
