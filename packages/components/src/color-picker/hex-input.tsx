/**
 * External dependencies
 */
import { colord, Colord } from 'colord';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Text } from '../text';
import { Spacer } from '../spacer';
import { space } from '../ui/utils/space';
import { ColorHexInputControl } from './styles';
import { COLORS } from '../utils/colors-values';
import type { StateReducer } from '../input-control/reducer/state';

interface HexInputProps {
	color: Colord;
	onChange: ( nextColor: Colord ) => void;
	enableAlpha: boolean;
}

export const HexInput = ( { color, onChange, enableAlpha }: HexInputProps ) => {
	const handleChange = ( nextValue: string | undefined ) => {
		if ( ! nextValue ) return;
		const hexValue = nextValue.startsWith( '#' )
			? nextValue
			: '#' + nextValue;

		onChange( colord( hexValue ) );
	};

	const stateReducer: StateReducer = ( state, action ) => {
		const nativeEvent = action.payload?.event?.nativeEvent as InputEvent;

		if ( 'insertFromPaste' !== nativeEvent?.inputType ) {
			return { ...state };
		}

		const value = state.value?.startsWith( '#' )
			? state.value.slice( 1 ).toUpperCase()
			: state.value?.toUpperCase();

		return { ...state, value };
	};

	return (
		<ColorHexInputControl
			prefix={
				<Spacer
					as={ Text }
					marginLeft={ space( 3.5 ) }
					color={ COLORS.ui.theme }
					lineHeight={ 1 }
				>
					#
				</Spacer>
			}
			value={ color.toHex().slice( 1 ).toUpperCase() }
			onChange={ handleChange }
			maxLength={ enableAlpha ? 9 : 7 }
			label={ __( 'Hex color' ) }
			hideLabelFromVision
			__unstableStateReducer={ stateReducer }
		/>
	);
};
