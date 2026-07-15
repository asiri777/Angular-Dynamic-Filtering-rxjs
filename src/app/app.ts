import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { State, states } from './shared/state';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'Angular-Dynamic-Filtering-rxjs';
  states$: Observable<State[]>;
  filteredStates$: Observable<State[]>;
  filter: FormControl<string>;
  filter$: Observable<string>;

  constructor() {
    this.states$ = of(states);
    this.filter = new FormControl('', { nonNullable: true });
    this.filter$ = this.filter.valueChanges.pipe(startWith(''));
    this.filteredStates$ = combineLatest([this.states$, this.filter$]).pipe(
      map(([statesList, filterString]) =>
        statesList.filter(state => state.name.indexOf(filterString) !== -1)
      )
    );
  }
}
