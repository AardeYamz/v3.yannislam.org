import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AardeYamzComponent } from './aardeyamz.component';

describe('AardeYamzComponent', () => {
  let component: AardeYamzComponent;
  let fixture: ComponentFixture<AardeYamzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AardeYamzComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AardeYamzComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
