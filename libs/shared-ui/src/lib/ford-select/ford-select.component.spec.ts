import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FordSelectComponent } from './ford-select.component';

describe('FordSelectComponent', () => {
  let fixture: ComponentFixture<FordSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FordSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FordSelectComponent);
  });

  it('emits the selected value', () => {
    const spy = vi.spyOn(fixture.componentInstance.valueChange, 'emit');

    fixture.componentInstance.updateValue('SPEEDING');

    expect(spy).toHaveBeenCalledWith('SPEEDING');
  });
});
