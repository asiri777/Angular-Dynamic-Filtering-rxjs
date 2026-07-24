import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have as title 'Angular-Dynamic-Filtering-rxjs'`, () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.title).toBe('Angular-Dynamic-Filtering-rxjs');
  });

  it('should render the filter input', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.placeholder).toBe('Filter states...');
  });

  it('should render all 59 states with an empty filter', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('li').length).toBe(59);
  });

  it('should filter the list by substring as the filter value changes', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    fixture.componentInstance.filter.setValue('New');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const names = Array.from(compiled.querySelectorAll('li')).map(li => li.textContent?.trim());
    expect(names).toEqual(['New Hampshire', 'New Jersey', 'New Mexico', 'New York']);
  });
});
