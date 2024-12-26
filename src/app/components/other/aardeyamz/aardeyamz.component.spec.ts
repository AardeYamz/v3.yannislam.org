import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AardeyamzComponent } from './aardeyamz.component';

describe('AardeyamzComponent', () => {
  let component: AardeyamzComponent;
  let fixture: ComponentFixture<AardeyamzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AardeyamzComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AardeyamzComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
