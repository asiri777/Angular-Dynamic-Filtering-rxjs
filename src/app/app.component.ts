import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, of, combineLatest } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { State, states } from './shared/State';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Angular-Dynamic-Filtering-rxjs';
  states$: Observable<State[]>;
  filteredStates$: Observable<State[]>;
  filter: FormControl;
  filter$: Observable<string>;

  constructor() {
    this.states$ = of(states);
    this.filter = new FormControl('');
    this.filter$ = this.filter.valueChanges.pipe(startWith(''));
    this.filteredStates$ = combineLatest(this.states$, this.filter$).pipe(
      map(([statesList, filterString]) => statesList.filter(state => state.name.indexOf(filterString) !== -1))
    );
  }
}
