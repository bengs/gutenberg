/**
 * External dependencies
 */
import type { SyntheticEvent, ChangeEvent, PointerEvent } from 'react';

/**
 * WordPress dependencies
 */
import { useReducer, useLayoutEffect, useRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import {
	InputState,
	StateReducer,
	initialInputControlState,
	initialStateReducer,
} from './state';
import * as actions from './actions';
import type { InputChangeCallback } from '../types';

/**
 * Prepares initialState for the reducer.
 *
 * @param  initialState The initial state.
 * @return Prepared initialState for the reducer
 */
function mergeInitialState(
	initialState: Partial< InputState > = initialInputControlState
): InputState {
	const { value } = initialState;

	return {
		...initialInputControlState,
		...initialState,
		initialValue: value,
	} as InputState;
}

/**
 * Creates a reducer that opens the channel for external state subscription
 * and modification.
 *
 * This technique uses the "stateReducer" design pattern:
 * https://kentcdodds.com/blog/the-state-reducer-pattern/
 *
 * @param  composedStateReducers A custom reducer that can subscribe and modify state.
 * @return The reducer.
 */
function inputControlStateReducer(
	composedStateReducers: StateReducer
): StateReducer {
	return ( state, action ) => {
		const nextState = { ...state };

		switch ( action.type ) {
			/**
			 * Keyboard events
			 */
			case actions.PRESS_UP:
				nextState.isDirty = false;
				break;

			case actions.PRESS_DOWN:
				nextState.isDirty = false;
				break;

			/**
			 * Drag events
			 */
			case actions.DRAG_START:
				nextState.isDragging = true;
				break;

			case actions.DRAG_END:
				nextState.isDragging = false;
				break;

			/**
			 * Input events
			 */
			case actions.CHANGE:
				nextState.error = null;
				nextState.value = action.payload.value;

				if ( state.isPressEnterToChange ) {
					nextState.isDirty = true;
				}

				break;

			case actions.COMMIT:
				nextState.value = action.payload.value;
				nextState.isDirty = false;
				break;

			case actions.RESET:
				nextState.error = null;
				nextState.isDirty = false;
				nextState.value = action.payload.value || state.initialValue;
				break;

			/**
			 * Validation
			 */
			case actions.INVALIDATE:
				nextState.error = action.payload.error;
				break;
		}

		nextState._event = action.payload.event;

		/**
		 * Send the nextState + action to the composedReducers via
		 * this "bridge" mechanism. This allows external stateReducers
		 * to hook into actions, and modify state if needed.
		 */
		return composedStateReducers( nextState, action );
	};
}

/**
 * A custom hook that connects and external stateReducer with an internal
 * reducer. This hook manages the internal state of InputControl.
 * However, by connecting an external stateReducer function, other
 * components can react to actions as well as modify state before it is
 * applied.
 *
 * This technique uses the "stateReducer" design pattern:
 * https://kentcdodds.com/blog/the-state-reducer-pattern/
 *
 * @param  stateReducer    An external state reducer.
 * @param  initialState    The initial state for the reducer.
 * @param  onChangeHandler A handler for the onChange event.
 * @return State, dispatch, and a collection of actions.
 */
export function useInputControlStateReducer(
	stateReducer: StateReducer = initialStateReducer,
	initialState: Partial< InputState > = initialInputControlState,
	onChangeHandler: InputChangeCallback
) {
	const [ state, dispatch ] = useReducer< StateReducer >(
		inputControlStateReducer( stateReducer ),
		mergeInitialState( initialState )
	);

	const createChangeEvent = ( type: actions.ChangeEventAction[ 'type' ] ) => (
		nextValue: actions.ChangeEventAction[ 'payload' ][ 'value' ],
		event: actions.ChangeEventAction[ 'payload' ][ 'event' ]
	) => {
		dispatch( {
			type,
			payload: { value: nextValue, event },
		} as actions.InputAction );
	};

	const createKeyEvent = ( type: actions.KeyEventAction[ 'type' ] ) => (
		event: actions.KeyEventAction[ 'payload' ][ 'event' ]
	) => {
		dispatch( { type, payload: { event } } );
	};

	const createDragEvent = ( type: actions.DragEventAction[ 'type' ] ) => (
		payload: actions.DragEventAction[ 'payload' ]
	) => {
		dispatch( { type, payload } );
	};

	/**
	 * Actions for the reducer
	 */
	const change = createChangeEvent( actions.CHANGE );
	const invalidate = ( error: unknown, event: SyntheticEvent ) =>
		dispatch( { type: actions.INVALIDATE, payload: { error, event } } );
	const reset = createChangeEvent( actions.RESET );
	const commit = createChangeEvent( actions.COMMIT );

	const dragStart = createDragEvent( actions.DRAG_START );
	const drag = createDragEvent( actions.DRAG );
	const dragEnd = createDragEvent( actions.DRAG_END );

	const pressUp = createKeyEvent( actions.PRESS_UP );
	const pressDown = createKeyEvent( actions.PRESS_DOWN );
	const pressEnter = createKeyEvent( actions.PRESS_ENTER );

	const currentState = useRef( state );
	const refProps = useRef( { value: initialState.value, onChangeHandler } );
	useLayoutEffect( () => {
		currentState.current = state;
		refProps.current = { value: initialState.value, onChangeHandler };
	} );
	useLayoutEffect( () => {
		if (
			currentState.current._event !== undefined &&
			state.value !== refProps.current.value &&
			! state.isDirty
		) {
			refProps.current.onChangeHandler( state.value ?? '', {
				event: currentState.current._event as
					| ChangeEvent< HTMLInputElement >
					| PointerEvent< HTMLInputElement >,
			} );
		}
	}, [ state.value, state.isDirty ] );
	useLayoutEffect( () => {
		if (
			initialState.value !== currentState.current.value &&
			! currentState.current.isDirty
		) {
			dispatch( {
				type: actions.RESET,
				payload: { value: initialState.value },
			} );
		}
	}, [ initialState.value ] );

	return {
		change,
		commit,
		dispatch,
		drag,
		dragEnd,
		dragStart,
		invalidate,
		pressDown,
		pressEnter,
		pressUp,
		reset,
		state,
	} as const;
}
