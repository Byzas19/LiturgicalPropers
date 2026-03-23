import { TextStyle } from 'react-native';

export const FontFamilies = {
  serif: 'NotoSerif_400Regular',
  serifBold: 'NotoSerif_700Bold',
  serifItalic: 'NotoSerif_400Regular_Italic',
  sans: 'NotoSans_400Regular',
  sansBold: 'NotoSans_700Bold',
};

export type FontSizeScale = 'small' | 'medium' | 'large';

const BASE_SIZES = {
  small: { body: 15, label: 11, reference: 13, title: 22, subtitle: 16, sectionLabel: 10 },
  medium: { body: 17, label: 12, reference: 14, title: 26, subtitle: 18, sectionLabel: 11 },
  large: { body: 20, label: 14, reference: 16, title: 30, subtitle: 21, sectionLabel: 13 },
};

export const getTypography = (scale: FontSizeScale = 'medium') => {
  const sizes = BASE_SIZES[scale];
  return {
    title: {
      fontFamily: FontFamilies.serifBold,
      fontSize: sizes.title,
      lineHeight: sizes.title * 1.3,
      letterSpacing: 0.3,
    } as TextStyle,
    subtitle: {
      fontFamily: FontFamilies.serif,
      fontSize: sizes.subtitle,
      lineHeight: sizes.subtitle * 1.4,
    } as TextStyle,
    body: {
      fontFamily: FontFamilies.serif,
      fontSize: sizes.body,
      lineHeight: sizes.body * 1.65,
    } as TextStyle,
    sectionLabel: {
      fontFamily: FontFamilies.sansBold,
      fontSize: sizes.sectionLabel,
      letterSpacing: 2.5,
      textTransform: 'uppercase' as const,
    } as TextStyle,
    reference: {
      fontFamily: FontFamilies.sans,
      fontSize: sizes.reference,
      fontStyle: 'italic' as const,
      lineHeight: sizes.reference * 1.5,
    } as TextStyle,
    subLabel: {
      fontFamily: FontFamilies.sans,
      fontSize: sizes.label,
      lineHeight: sizes.label * 1.5,
    } as TextStyle,
    caption: {
      fontFamily: FontFamilies.sans,
      fontSize: sizes.label,
      lineHeight: sizes.label * 1.4,
    } as TextStyle,
  };
};
