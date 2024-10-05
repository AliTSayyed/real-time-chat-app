import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'customdate2',
  standalone: true
})
export class Customdate2Pipe implements PipeTransform {

   // custom date pipe so messages can be seen as Today, Yesterday, Day of week (sent within a week), or MM/DD/YY. 
   transform(value: string): string | null {
    const currentDate = new Date(); // current time
    const messageDate = new Date(value); // message sent time (from backend)

    const oneDay = 24 * 60 * 60 * 1000 // miliseconds in one day 
    const timeDifference = currentDate.getTime() - messageDate.getTime(); // calculate how long ago a message was sent

    // Use angular's date pipe for formatting the date
    const datePipe = new DatePipe('en-US');

    // Return Today hh : mm a if message was sent on same date
    if (this.isSameDay(currentDate, messageDate)){
      return datePipe.transform(messageDate, 'shortTime') || '';
    }

    // Return Yesterday hh : mm if message was sent one day ago
    if (this.isYesterday(currentDate, messageDate)){
      return 'Yesterday';
    }

    // Check if the date is within the last week (not including today or yesterday)
    if (timeDifference >= 2 * oneDay && timeDifference < 6 * oneDay ) {
      return datePipe.transform(messageDate, 'EEEE'); // Day of the week, hour : minute, 
    }

    // else reutrn the date as month, day, year, time. 
    return datePipe.transform(messageDate, 'MM/dd/yy') || '';
  } 

  // Helper function to check if message was sent on the same day
  private isSameDay(date1: Date, date2:Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Helper function to check if the message was sent yesterday
  private isYesterday(currentDate: Date, messageDate: Date): boolean {
    const yesterday = new Date()
    yesterday.setDate(currentDate.getDate() - 1);
    return this.isSameDay(yesterday, messageDate);
  }

}
