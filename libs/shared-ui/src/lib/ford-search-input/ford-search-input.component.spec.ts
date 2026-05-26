import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FordSearchInputComponent } from './ford-search-input.component';

describe('FordSearchInputComponent', () => {
  let fixture: ComponentFixture<FordSearchInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FordSearchInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FordSearchInputComponent);
  });

  it('emits an empty value when cleared', () => {
    const spy = vi.spyOn(fixture.componentInstance.valueChange, 'emit');

    fixture.componentInstance.clear();

    expect(spy).toHaveBeenCalledWith('');
  });
});
