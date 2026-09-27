import { Pressable } from 'react-native';
import { buttons } from '../../theme';

// The app's primary action button: sky blue, darker blue while pressed.
// Drop-in for a TouchableOpacity whose `style` already has the primary look;
// children render inside as before.
const PrimaryButton = ({ style, disabled, children, ...props }) => (
  <Pressable
    {...props}
    disabled={disabled}
    style={({ pressed }) => [style, pressed && !disabled && buttons.primaryPressed]}
  >
    {children}
  </Pressable>
);

export default PrimaryButton;
