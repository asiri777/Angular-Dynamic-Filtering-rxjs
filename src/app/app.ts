import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, combineLatest, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { State, states } from './shared/state';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly title = 'Angular-Dynamic-Filtering-rxjs';
  readonly filter = new FormControl('', { nonNullable: true });

  private readonly states$: Observable<State[]> = of(states);
  private readonly filter$: Observable<string> = this.filter.valueChanges.pipe(startWith(''));

  readonly filteredStates$: Observable<State[]> = combineLatest([this.states$, this.filter$]).pipe(
    map(([statesList, filterString]) =>
      statesList.filter((state) => state.name.includes(filterString))
    )
  );
}
