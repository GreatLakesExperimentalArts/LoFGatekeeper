import { Component } from 'react';
import { AppThunkAction } from '../';
import { actionCreators } from './index';
import { Attendee, AttendeesState } from './dto';
import { KnownAction } from './actions';

export abstract class StatefulTable<T> extends Component<AttendeesState & typeof actionCreators, T> {
  public abstract setInputState(
    index: number,
    key: keyof StatefulRow,
    state: Pick<StatefulComponentState, any>,
    callback?: () => void
  ): AppThunkAction<KnownAction>;
}

export class StatefulRow {
  dob: StatefulComponentState = { value: '', valid: false, disabled: false, static: false, input: null };
  wristband: StatefulComponentState = { value: '', valid: false, disabled: true, static: true, input: null };
  buttons: { mode: 'commit' | 'delete' | 'none' } = { mode: 'none' };
}

export interface StatefulComponentState {
  value: string;
  disabled: boolean;
  static: boolean;
  valid: boolean;
  input?: Component | null;
}

export abstract class StatefulComponent<
    T extends StatefulComponentProps,
    U extends StatefulComponentState
  > extends Component<T, U> {
}

export class StatefulComponentProps implements StatefulComponentState {
  index: number = -1;
  attendee?: Attendee;
  table?: StatefulTable<any>;
  onValidated?: <T>(input: T) => void;

  value: string = '';
  static: boolean = true;
  disabled: boolean = false;
  valid: boolean = false;
}