import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, font, radius } from '../constants/theme';

export type FilterOption = {
  key: string;
  label: string;
  color?: string;
};

interface Props {
  options: FilterOption[];
  value: string;
  onChange: (key: string) => void;
}

export default function FilterBar({ options, value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        const accentColor = opt.color ?? colors.primary;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              active
                ? { backgroundColor: accentColor, borderColor: accentColor }
                : { borderColor: accentColor + '44' },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: active ? '#fff' : accentColor },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: font.weight.semibold,
    letterSpacing: 0.2,
  },
});
