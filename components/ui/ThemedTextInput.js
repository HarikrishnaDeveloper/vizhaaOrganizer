import { forwardRef, useState } from 'react';
import { TextInput } from 'react-native';
import { colors, inputFocused } from '../../theme';

// Drop-in TextInput that applies the design system's focused border and
// placeholder color. Callers keep passing their own `style`.
const ThemedTextInput = forwardRef(({ style, onFocus, onBlur, ...props }, ref) => {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.primary}
      cursorColor={colors.primary}
      {...props}
      style={[style, focused && props.editable !== false && inputFocused]}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
    />
  );
});

export default ThemedTextInput;
