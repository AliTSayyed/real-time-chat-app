import { TestBed } from '@angular/core/testing';

import { LastmessageService } from './lastmessage.service';

describe('LastmessageService', () => {
  let service: LastmessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LastmessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
