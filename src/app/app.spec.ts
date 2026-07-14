import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { State, states } from './shared/state';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render all states initially', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    expect(items.length).toBe(states.length);
  });

  it('should filter the state list by name', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    let latest: State[] = [];
    const sub = app.filteredStates$.subscribe((value) => (latest = value));
    app.filter.setValue('New');
    sub.unsubscribe();
    expect(latest.map((state) => state.name)).toEqual([
      'New Hampshire',
      'New Jersey',
      'New Mexico',
      'New York',
    ]);
  });
});
