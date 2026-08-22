import React from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import { C } from '../constants';
import { Typo } from './Typo';

type Props = {
  /** 위에 붙는 설명. 없으면 입력칸만 그린다. */
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** 입력 아래 한 줄 안내. 오류 문구를 여기에 띄운다. */
  error?: string;
  style?: StyleProp<TextStyle>;
};

/** 라벨 + 입력칸. 세 화면이 같은 테두리·여백을 쓰고 있었다. */
export function Field({ label, value, onChangeText, placeholder, autoFocus, error, style }: Props) {
  return (
    <View>
      {label ? (
        <Typo level="caption" color={C.z500}>
          {label}
        </Typo>
      ) : null}
      <TextInput
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.z700}
        style={[styles.input, style]}
      />
      {error ? (
        <Typo level="caption" color={C.white}>
          {error}
        </Typo>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: C.white,
    marginBottom: 12,
  },
});
